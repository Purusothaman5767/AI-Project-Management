// backend/src/services/aiService.ts
import { GoogleGenAI } from '@google/genai';
import { Project } from '../models/Project';
import { Task } from '../models/Task';
import { User, UserRole } from '../models/User';
import { ChatMessage } from '../validation/ai';

export interface GroundedContextStats {
  projectCount: number;
  taskCount: number;
  overdueTaskCount: number;
}

export interface AssistantChatResult {
  reply: string;
  model: string;
  groundedContext: GroundedContextStats;
}

export interface ChatWithAssistantParams {
  userId: string;
  role: string;
  message: string;
  history?: ChatMessage[];
}

/**
 * Custom error types for AI failures
 */
export class AIConfigError extends Error {
  code = 'CONFIG_MISSING';
  statusCode = 503;
  constructor(message = 'GEMINI_API_KEY is not configured on the server. Live AI testing is blocked until an API key is provided.') {
    super(message);
    this.name = 'AIConfigError';
  }
}

export class AIRateLimitError extends Error {
  code = 'RATE_LIMIT';
  statusCode = 429;
  constructor(message = 'AI provider rate limit reached. Please wait a moment before trying again.') {
    super(message);
    this.name = 'AIRateLimitError';
  }
}

export class AIProviderError extends Error {
  code = 'PROVIDER_ERROR';
  statusCode = 502;
  constructor(message = 'AI provider encountered an error while generating response.') {
    super(message);
    this.name = 'AIProviderError';
  }
}

/**
 * Fetch and build the grounded workspace context from MongoDB
 * for the authenticated user.
 */
export const buildGroundedContext = async (userId: string, role: string) => {
  // 1. Fetch current user info
  const currentUser = await User.findById(userId).select('name email role').lean().exec();
  const userName = currentUser?.name || 'User';
  const userEmail = currentUser?.email || 'unknown';
  const userRoleStr = currentUser?.role || role;

  // 2. Query visible projects based on role
  let projects: any[] = [];
  if (role === UserRole.ADMIN || role === 'ADMIN') {
    projects = await Project.find()
      .populate('owner', 'name email role')
      .populate('members', 'name email role')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  } else {
    projects = await Project.find({
      $or: [{ owner: userId }, { members: userId }],
    })
      .populate('owner', 'name email role')
      .populate('members', 'name email role')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  // 3. Query all tasks belonging to visible projects
  const projectIds = projects.map((p) => p._id);
  const tasks = await Task.find({ project: { $in: projectIds } })
    .populate('assignee', 'name email role')
    .populate('creator', 'name email role')
    .sort({ dueDate: 1, priority: -1 })
    .lean()
    .exec();

  // 4. Calculate metrics and deadline flags
  const now = new Date();
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).getTime() < now.getTime() && t.status !== 'DONE'
  );

  // Group tasks by project
  const tasksByProject: Record<string, any[]> = {};
  for (const t of tasks) {
    const pId = t.project.toString();
    if (!tasksByProject[pId]) tasksByProject[pId] = [];
    tasksByProject[pId].push(t);
  }

  // Calculate workload per team member
  const memberWorkload: Record<string, { name: string; email: string; taskCount: number; criticalCount: number }> = {};
  for (const t of tasks) {
    const assignee = t.assignee as any;
    if (assignee && typeof assignee === 'object' && '_id' in assignee) {
      const aId = assignee._id.toString();
      if (!memberWorkload[aId]) {
        memberWorkload[aId] = {
          name: assignee.name || 'Unknown',
          email: assignee.email || '',
          taskCount: 0,
          criticalCount: 0,
        };
      }
      memberWorkload[aId].taskCount += 1;
      if (t.priority === 'CRITICAL' || t.priority === 'HIGH') {
        memberWorkload[aId].criticalCount += 1;
      }
    }
  }

  // 5. Build structured text representation
  let projectsSummary = '';
  if (projects.length === 0) {
    projectsSummary = 'No projects currently exist in this workspace.';
  } else {
    projectsSummary = projects
      .map((p, idx) => {
        const pTasks = tasksByProject[p._id.toString()] || [];
        const completedCount = pTasks.filter((t) => t.status === 'DONE').length;
        const pOverdue = pTasks.filter(
          (t) => t.dueDate && new Date(t.dueDate).getTime() < now.getTime() && t.status !== 'DONE'
        ).length;

        const ownerName = p.owner?.name ? `${p.owner.name} (${p.owner.email})` : 'Unassigned';
        const membersList = (p.members || []).map((m: any) => m.name || m.email).join(', ') || 'None';

        const taskLines = pTasks
          .map((t) => {
            const assignee = t.assignee as any;
            const assigneeStr = assignee?.name ? assignee.name : 'Unassigned';
            const dueStr = t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : 'No due date';
            const isTaskOverdue =
              t.dueDate && new Date(t.dueDate).getTime() < now.getTime() && t.status !== 'DONE';
            return `    - [${t.status}] ${t.title} | Priority: ${t.priority} | Assignee: ${assigneeStr} | Due: ${dueStr}${isTaskOverdue ? ' (OVERDUE)' : ''}`;
          })
          .join('\n');

        return `${idx + 1}. PROJECT: "${p.name}" (ID: ${p._id})
   - Status: ${p.status} | Priority: ${p.priority}
   - Timeline: ${p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : 'N/A'} to ${p.deadline ? new Date(p.deadline).toISOString().slice(0, 10) : 'N/A'}
   - Owner: ${ownerName}
   - Members: ${membersList}
   - Description: ${p.description || 'None'}
   - Progress: ${completedCount}/${pTasks.length} tasks completed (${pOverdue} overdue)
   - Tasks:
${taskLines || '    (No tasks recorded for this project)'}`;
      })
      .join('\n\n');
  }

  const workloadSummary = Object.values(memberWorkload)
    .map(
      (m) =>
        `- ${m.name} (${m.email}): ${m.taskCount} tasks assigned (${m.criticalCount} high/critical priority)`
    )
    .join('\n') || '- No tasks assigned to specific team members yet.';

  const systemInstruction = `You are Nimbus PM AI Assistant, an expert, proactive project management intelligence copilot embedded within the Nimbus PM workspace.
You provide insightful, accurate, and actionable project management advice strictly based on the real-time project and task data provided below.

CURRENT WORKSPACE CONTEXT:
- Current Server Date/Time: ${now.toISOString().slice(0, 10)}
- Authenticated User: ${userName} (${userEmail}), Role: ${userRoleStr}
- Total Accessible Projects: ${projects.length}
- Total Tasks: ${tasks.length}
- Overdue Tasks: ${overdueTasks.length}

DETAILED PROJECTS & TASKS BREAKDOWN:
${projectsSummary}

TEAM WORKLOAD DISTRIBUTION:
${workloadSummary}

CORE BEHAVIOR RULES:
1. Base all project risk evaluations, deadline predictions, task prioritizations, and workload balancing recommendations STRICTLY on the actual data provided above.
2. If asked about project risks ("Which projects are at risk?"), analyze projects with overdue tasks, approaching deadlines, or high volumes of pending high-priority tasks. Name specific projects and overdue tasks.
3. If asked about deadlines ("Predict our deadlines"), look at the project deadlines, task due dates, and completion ratios to provide realistic status assessments.
4. If asked about priorities ("What should we prioritise?"), recommend addressing overdue tasks and CRITICAL/HIGH priority items first.
5. If asked about workload ("Is the workload balanced?"), highlight team members with disproportionately high task counts and suggest reassignments if available.
6. If the workspace is empty, kindly suggest creating their first project or tasks.
7. NEVER invent fictitious projects, team members, or tasks that do not appear in the context.
8. Be direct, concise, and structured. Use markdown formatting with bullet points and bold highlights.`;

  return {
    systemInstruction,
    projects,
    tasks,
    overdueTasks,
    memberWorkload,
    projectCount: projects.length,
    taskCount: tasks.length,
    overdueTaskCount: overdueTasks.length,
  };
};

/**
 * Intelligent Local Analytical Copilot used as an automatic fallback
 * when GEMINI_API_KEY is not configured on the server.
 */
function generateLocalAnalyticalResponse(message: string, contextData: any): string {
  const q = message.toLowerCase();
  const { projects, tasks, overdueTasks, memberWorkload } = contextData;
  const now = new Date();

  if (projects.length === 0) {
    return `### 📊 Workspace Status: Empty\n\nThere are currently **no active projects** in your workspace.\n\nTo get started:\n1. Click **New Project** on the Projects tab.\n2. Define your timeline and assign team members.\n3. Add tasks and deadlines to begin tracking AI insights!`;
  }

  // 1. RISK ANALYSIS QUERY
  if (q.includes('risk') || q.includes('danger') || q.includes('late') || q.includes('behind') || q.includes('warning')) {
    if (overdueTasks.length === 0) {
      return `### 🛡️ Portfolio Risk Assessment: Low Risk\n\nAll tasks are currently **on schedule**! No overdue tasks were detected across your ${projects.length} projects.\n\n**Key Observations:**\n- **Active Projects:** ${projects.filter((p: any) => p.status === 'IN_PROGRESS').length}\n- **Upcoming Milestones:** Monitor projects with high priority to prevent bottlenecks.`;
    }

    const projectsWithOverdue = projects.filter((p: any) =>
      overdueTasks.some((t: any) => t.project.toString() === p._id.toString())
    );

    const overdueList = overdueTasks
      .slice(0, 5)
      .map((t: any) => {
        const p = projects.find((proj: any) => proj._id.toString() === t.project.toString());
        const assignee = t.assignee?.name || 'Unassigned';
        const dueStr = t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : 'N/A';
        return `- ⚠️ **${t.title}** (Project: *${p?.name || 'Unknown'}*, Assignee: **${assignee}**, Due: **${dueStr}**, Priority: \`${t.priority}\`)`;
      })
      .join('\n');

    return `### 🚨 Risk Alert: ${overdueTasks.length} Overdue Task${overdueTasks.length === 1 ? '' : 's'} Detected\n\n**Projects Requiring Immediate Attention:**\n${projectsWithOverdue.map((p: any) => `• **${p.name}** (\`${p.status}\`, Priority: \`${p.priority}\`)`).join('\n')}\n\n**Critical Overdue Tasks:**\n${overdueList}\n\n**Recommended Actions:**\n1. Re-assign or break down blocking tasks into smaller sub-tasks.\n2. Review target deadlines for affected projects.\n3. Rebalance pending items among available team members.`;
  }

  // 2. DEADLINE PREDICTION QUERY
  if (q.includes('deadline') || q.includes('predict') || q.includes('when') || q.includes('schedule') || q.includes('timeline')) {
    const projectSummaries = projects.map((p: any) => {
      const pTasks = tasks.filter((t: any) => t.project.toString() === p._id.toString());
      const done = pTasks.filter((t: any) => t.status === 'DONE').length;
      const pct = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;
      const deadlineStr = p.deadline ? new Date(p.deadline).toISOString().slice(0, 10) : 'Unset';
      const isPast = p.deadline && new Date(p.deadline).getTime() < now.getTime() && p.status !== 'COMPLETED';

      let statusIcon = '🟢';
      if (isPast) statusIcon = '🔴';
      else if (pct < 50 && p.status === 'IN_PROGRESS') statusIcon = '🟡';

      return `${statusIcon} **${p.name}**: ${pct}% complete (${done}/${pTasks.length} tasks). Target Deadline: **${deadlineStr}**${isPast ? ' *(Overdue)*' : ''}`;
    }).join('\n');

    return `### 📅 Deadline Forecast & Progress Velocity\n\n${projectSummaries}\n\n**Timeline Health Summary:**\n- **Total Projects Tracked:** ${projects.length}\n- **Tasks Remaining:** ${tasks.filter((t: any) => t.status !== 'DONE').length} tasks\n- **Projected Feasibility:** Projects with high completion velocity (>60%) are on track for on-time delivery.`;
  }

  // 3. PRIORITY SUGGESTIONS QUERY
  if (q.includes('priorit') || q.includes('focus') || q.includes('first') || q.includes('next') || q.includes('what should')) {
    const criticalTasks = tasks.filter((t: any) => (t.priority === 'CRITICAL' || t.priority === 'HIGH') && t.status !== 'DONE');

    if (criticalTasks.length === 0) {
      return `### 🎯 Priority Recommendation\n\nGreat news! There are no pending **CRITICAL** or **HIGH** priority tasks in the backlog.\n\n**Recommended Next Focus:**\n- Review pending **MEDIUM** priority tasks.\n- Verify upcoming milestone deadlines for next sprint planning.`;
    }

    const priorityItems = criticalTasks.slice(0, 6).map((t: any) => {
      const p = projects.find((proj: any) => proj._id.toString() === t.project.toString());
      const dueStr = t.dueDate ? `due ${new Date(t.dueDate).toISOString().slice(0, 10)}` : 'no due date';
      return `- **[${t.priority}]** **${t.title}** (${p?.name || 'Project'} · ${dueStr})`;
    }).join('\n');

    return `### 🎯 High-Impact Task Prioritization\n\nFocus the team on these high-leverage items first to unblock milestones:\n\n${priorityItems}\n\n**Execution Strategy:**\n1. Resolve items with imminent due dates first.\n2. Ensure assignees have sufficient bandwidth before tackling new features.`;
  }

  // 4. WORKLOAD QUERY
  if (q.includes('workload') || q.includes('team') || q.includes('balance') || q.includes('busy') || q.includes('capacity') || q.includes('member')) {
    const members = Object.values(memberWorkload) as any[];
    if (members.length === 0) {
      return `### 👥 Team Workload Analysis\n\nNo tasks are currently assigned to specific team members.\n\n**Recommendation:** Assign tasks to teammates in the Tasks view to enable live workload tracking.`;
    }

    const breakdown = members.map((m: any) => {
      let status = 'Available';
      if (m.taskCount >= 4 || m.criticalCount >= 2) status = 'Overloaded';
      else if (m.taskCount >= 2) status = 'Balanced';
      return `- **${m.name}** (${m.email}): **${m.taskCount} tasks** (${m.criticalCount} high priority) · Status: *${status}*`;
    }).join('\n');

    return `### 👥 Team Workload Distribution\n\n${breakdown}\n\n**Optimization Insights:**\n• Ensure team members marked as *Overloaded* receive assistance or reassignment of non-critical items.\n• Teammates with fewer than 2 tasks have available capacity for upcoming milestones.`;
  }

  // 5. GENERAL WORKSPACE SUMMARY
  const activeProjectsCount = projects.filter((p: any) => p.status === 'IN_PROGRESS').length;
  const completedTasksCount = tasks.filter((t: any) => t.status === 'DONE').length;

  return `### 💡 Nimbus PM Workspace Intelligence Summary\n\nHere is your real-time portfolio snapshot:\n\n- 📁 **Active Projects:** ${activeProjectsCount} of ${projects.length} total\n- ✅ **Task Completion:** ${completedTasksCount} of ${tasks.length} tasks completed\n- ⚠️ **Overdue Tasks:** ${overdueTasks.length}\n- 👥 **Team Members Active:** ${Object.keys(memberWorkload).length}\n\n**You can ask me questions like:**\n- *"Which projects are at risk?"*\n- *"Predict our deadlines"*\n- *"What should we prioritise?"*\n- *"Is the workload balanced?"*`;
}

/**
 * Process a message with the Gemini AI model grounded in live MongoDB workspace context.
 * Automatically falls back to the intelligent built-in analytical engine if GEMINI_API_KEY is not configured.
 */
export const chatWithAssistant = async (
  params: ChatWithAssistantParams
): Promise<AssistantChatResult> => {
  const { userId, role, message, history } = params;

  // 1. Build live grounded context from MongoDB
  const contextData = await buildGroundedContext(userId, role);
  const { systemInstruction, projectCount, taskCount, overdueTaskCount } = contextData;

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // 2. If GEMINI_API_KEY is missing, gracefully provide the local intelligence engine analysis
  if (!apiKey) {
    const localReply = generateLocalAnalyticalResponse(message, contextData);
    return {
      reply: localReply,
      model: 'Nimbus PM Local Intelligence Engine',
      groundedContext: {
        projectCount,
        taskCount,
        overdueTaskCount,
      },
    };
  }

  // 3. When GEMINI_API_KEY is provided, invoke Google GenAI SDK
  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

    const contents: any[] = [];
    if (history && history.length > 0) {
      for (const item of history) {
        contents.push({
          role: item.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: item.content }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text?.trim();
    if (!reply) {
      throw new Error('Empty response received from AI provider.');
    }

    return {
      reply,
      model: modelName,
      groundedContext: {
        projectCount,
        taskCount,
        overdueTaskCount,
      },
    };
  } catch (err: any) {
    console.warn('[Gemini API Fallback to Local Engine]:', err?.message);

    // If rate limit or authentication failure, gracefully fallback to local analytics
    const localReply = generateLocalAnalyticalResponse(message, contextData);
    return {
      reply: `${localReply}\n\n*(Note: Generated via Nimbus PM Local AI Intelligence Engine due to external provider status: ${err?.message || 'Rate limit/Config'})*`,
      model: 'Nimbus PM Local Intelligence Engine',
      groundedContext: {
        projectCount,
        taskCount,
        overdueTaskCount,
      },
    };
  }
};
