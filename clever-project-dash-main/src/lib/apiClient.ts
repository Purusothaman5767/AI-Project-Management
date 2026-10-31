// src/lib/apiClient.ts

/**
 * Minimal reusable API client for ProjectMind backend.
 * Provides functions to fetch projects and tasks for a given project.
 * Uses cookie‑based authentication (credentials: "include").
 * Base URL is read from VITE_API_BASE_URL env var, falling back to "/api".
 */

// Types matching backend responses
export interface UserBrief {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  owner: UserBrief;
  members: UserBrief[];
  startDate?: string;
  deadline?: string;
  status: string; // ProjectStatus enum values
  priority: string; // ProjectPriority enum values
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  project: string; // project id
  assignee?: UserBrief;
  creator: UserBrief;
  status: string; // TaskStatus enum values
  priority: string; // TaskPriority enum values
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

/** Helper to retrieve the stored access token from localStorage */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

/** Helper to store the access token in localStorage */
export function setAccessToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', token);
  }
}

/** Helper to remove the stored access token from localStorage */
export function removeAccessToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
  }
}

/** Helper to retrieve the active user profile stored in localStorage */
export function getStoredUser(): UserBrief | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Helper to check if a user is a Team Lead / Project Manager / Admin */
export function isTeamLead(user?: UserBrief | null): boolean {
  if (!user) return false;
  const r = (user.role || '').toUpperCase();
  return r === 'TEAM_LEAD' || r === 'PROJECT_MANAGER' || r === 'ADMIN';
}

/** Build auth headers containing Authorization Bearer token when available */
function getAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const token = getAccessToken();
  const authHeaders: Record<string, string> = { ...headers };
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }
  return authHeaders;
}

/** Helper to build a full URL without duplicate slashes */
function buildUrl(path: string): string {
  const base = (import.meta.env?.['VITE_API_BASE_URL'] ?? '/api').replace(/\/+$/, '');
  const cleanPath = path.replace(/^\//, '');
  return `${base}/${cleanPath}`;
}

/**
 * Fetch all projects visible to the authenticated user.
 * @throws Error with status and server message when response is not OK.
 */
export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(buildUrl('/projects'), {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || response.statusText;
    throw new Error(`Failed to fetch projects (status ${response.status}): ${message}`);
  }
  const data: Project[] = await response.json();
  return data;
}

/**
 * Fetch a single project by ID.
 * Direct endpoint is attempted first; falls back to locating within fetchProjects() if needed.
 * @throws Error with status (e.g. 404) when project is not found or request fails.
 */
export async function fetchProjectById(id: string): Promise<Project> {
  if (!id) {
    throw new Error('Project id is required');
  }

  try {
    const response = await fetch(buildUrl(`/projects/${id}`), {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      const data: Project = await response.json();
      return data;
    }
    if (response.status === 404) {
      const err = new Error(`Project ${id} not found`);
      Object.assign(err, { status: 404 });
      throw err;
    }
  } catch (err: unknown) {
    if (
      err !== null &&
      typeof err === 'object' &&
      'status' in err &&
      (err as { status: unknown }).status === 404
    ) {
      throw err;
    }
  }

  // Fallback to locating the project within fetchProjects()
  const allProjects = await fetchProjects();
  const matched = allProjects.find((p) => p._id === id);
  if (!matched) {
    const notFoundErr = new Error(`Project ${id} not found`);
    Object.assign(notFoundErr, { status: 404 });
    throw notFoundErr;
  }
  return matched;
}

/**
 * Fetch tasks for a specific project.
 * @param projectId - The project identifier.
 * @throws Error with status and server message when response is not OK.
 */
export async function fetchProjectTasks(projectId: string): Promise<Task[]> {
  if (!projectId) {
    throw new Error('projectId is required');
  }
  const response = await fetch(buildUrl(`/projects/${projectId}/tasks`), {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || response.statusText;
    throw new Error(`Failed to fetch tasks for project ${projectId} (status ${response.status}): ${message}`);
  }
  const data: Task[] = await response.json();
  return data;
}

export interface CreateProjectInput {
  name: string;
  description?: string | undefined;
  startDate: string;
  deadline: string;
  status?: string | undefined;
  priority?: string | undefined;
  members?: string[] | undefined;
}

export interface UpdateProjectInput {
  name?: string | undefined;
  description?: string | undefined;
  startDate?: string | undefined;
  deadline?: string | undefined;
  status?: string | undefined;
  priority?: string | undefined;
  members?: string[] | undefined;
}

/**
 * Create a new project.
 * @throws Error with status and server message when response is not OK.
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  const response = await fetch(buildUrl('/projects'), {
    method: 'POST',
    headers: getAuthHeaders({
      'Content-Type': 'application/json',
    }),
    credentials: 'include',
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || response.statusText;
    throw new Error(`Failed to create project (status ${response.status}): ${message}`);
  }
  const data: Project = await response.json();
  return data;
}

/**
 * Update an existing project by ID.
 * @throws Error with status and server message when response is not OK.
 */
export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
  if (!id) throw new Error('Project id is required');
  const response = await fetch(buildUrl(`/projects/${id}`), {
    method: 'PUT',
    headers: getAuthHeaders({
      'Content-Type': 'application/json',
    }),
    credentials: 'include',
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || response.statusText;
    throw new Error(`Failed to update project (status ${response.status}): ${message}`);
  }
  const data: Project = await response.json();
  return data;
}

/**
 * Delete a project by ID.
 * @throws Error with status and server message when response is not OK.
 */
export async function deleteProject(id: string): Promise<void> {
  if (!id) throw new Error('Project id is required');
  const response = await fetch(buildUrl(`/projects/${id}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || response.statusText;
    throw new Error(`Failed to delete project (status ${response.status}): ${message}`);
  }
}

export interface CreateTaskInput {
  title: string;
  description?: string | undefined;
  assignee?: string | undefined;
  status?: string | undefined;
  priority?: string | undefined;
  dueDate?: string | undefined;
}

export interface UpdateTaskInput {
  title?: string | undefined;
  description?: string | undefined;
  assignee?: string | undefined;
  status?: string | undefined;
  priority?: string | undefined;
  dueDate?: string | undefined;
}

interface CreateTaskPayload {
  title: string;
  description?: string;
  assignee?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
}

interface UpdateTaskPayload {
  title?: string;
  description?: string;
  assignee?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
}

/**
 * Create a new task within a project.
 * @throws Error with status and server message when response is not OK.
 */
export async function createTask(projectId: string, input: CreateTaskInput): Promise<Task> {
  if (!projectId) {
    throw new Error('projectId is required');
  }
  const cleanInput: CreateTaskPayload = {
    title: input.title,
  };
  if (input.description) cleanInput.description = input.description;
  if (input.assignee) cleanInput.assignee = input.assignee;
  if (input.status) cleanInput.status = input.status;
  if (input.priority) cleanInput.priority = input.priority;
  if (input.dueDate) cleanInput.dueDate = input.dueDate;

  const response = await fetch(buildUrl(`/projects/${projectId}/tasks`), {
    method: 'POST',
    headers: getAuthHeaders({
      'Content-Type': 'application/json',
    }),
    credentials: 'include',
    body: JSON.stringify(cleanInput),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || response.statusText;
    throw new Error(`Failed to create task (status ${response.status}): ${message}`);
  }
  const data: Task = await response.json();
  return data;
}

/**
 * Update an existing task by ID.
 * @throws Error with status and server message when response is not OK.
 */
export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
  if (!taskId) {
    throw new Error('taskId is required');
  }
  const cleanInput: UpdateTaskPayload = {};
  if (input.title !== undefined) cleanInput.title = input.title;
  if (input.description !== undefined) cleanInput.description = input.description;
  if (input.assignee !== undefined && input.assignee !== '') cleanInput.assignee = input.assignee;
  if (input.status !== undefined) cleanInput.status = input.status;
  if (input.priority !== undefined) cleanInput.priority = input.priority;
  if (input.dueDate !== undefined && input.dueDate !== '') cleanInput.dueDate = input.dueDate;

  const response = await fetch(buildUrl(`/tasks/${taskId}`), {
    method: 'PUT',
    headers: getAuthHeaders({
      'Content-Type': 'application/json',
    }),
    credentials: 'include',
    body: JSON.stringify(cleanInput),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || response.statusText;
    throw new Error(`Failed to update task (status ${response.status}): ${message}`);
  }
  const data: Task = await response.json();
  return data;
}

export interface AssistantChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantRequestPayload {
  message: string;
  history?: AssistantChatMessage[];
}

export interface AssistantResponse {
  reply: string;
  model: string;
  groundedContext?: {
    projectCount: number;
    taskCount: number;
    overdueTaskCount: number;
  };
}

export class AssistantApiError extends Error {
  status: number;
  code?: string | undefined;

  constructor(message: string, status: number, code?: string | undefined) {
    super(message);
    this.name = 'AssistantApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Send a message to the AI Assistant grounded in user's MongoDB projects and tasks.
 * Uses cookie-based authentication (credentials: 'include').
 * @throws AssistantApiError on API errors (400, 401, 429, 502, 503).
 */
export async function askAssistant(payload: AssistantRequestPayload): Promise<AssistantResponse> {
  if (!payload || !payload.message || !payload.message.trim()) {
    throw new Error('Message is required');
  }

  const response = await fetch(buildUrl('/ai/assistant'), {
    method: 'POST',
    headers: getAuthHeaders({
      'Content-Type': 'application/json',
    }),
    credentials: 'include',
    body: JSON.stringify({
      message: payload.message.trim(),
      history: payload.history && payload.history.length > 0 ? payload.history : undefined,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || response.statusText || 'Failed to process AI assistant request';
    throw new AssistantApiError(message, response.status, errorBody.code);
  }

  const data: AssistantResponse = await response.json();
  return data;
}

export interface TeamMember {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  assignedTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  workload: number;
}

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasksCount: number;
  overdueTasks: Array<{
    _id: string;
    title: string;
    dueDate?: string;
    priority: string;
    project?: any;
    assignee?: any;
  }>;
  recentProjects: Array<{
    _id: string;
    name: string;
    description?: string;
    status: string;
    priority: string;
    deadline?: string;
    totalTasks: number;
    completedTasks: number;
    progress: number;
  }>;
  recentTasks: Array<Task>;
  teamMembers: UserBrief[];
  progressTrend: Array<{ month: string; planned: number; completed: number }>;
}

export interface TaskQueryParams {
  projectId?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  search?: string;
}

/**
 * Fetch all team members with calculated workload metrics from MongoDB.
 */
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const response = await fetch(buildUrl('/users/team'), {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || response.statusText;
    throw new Error(`Failed to fetch team members (status ${response.status}): ${message}`);
  }
  return await response.json();
}

/**
 * Fetch all registered users for member assignment.
 */
export async function fetchUsers(): Promise<UserBrief[]> {
  const response = await fetch(buildUrl('/users'), {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || response.statusText;
    throw new Error(`Failed to fetch users (status ${response.status}): ${message}`);
  }
  return await response.json();
}

/**
 * Fetch all tasks visible to current user across projects with optional filters.
 */
export async function fetchAllTasks(params?: TaskQueryParams): Promise<Task[]> {
  const query = new URLSearchParams();
  if (params?.projectId) query.set('projectId', params.projectId);
  if (params?.status) query.set('status', params.status);
  if (params?.priority) query.set('priority', params.priority);
  if (params?.assignee) query.set('assignee', params.assignee);
  if (params?.search) query.set('search', params.search);

  const queryString = query.toString();
  const url = queryString ? `/tasks?${queryString}` : '/tasks';

  const response = await fetch(buildUrl(url), {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || response.statusText;
    throw new Error(`Failed to fetch tasks (status ${response.status}): ${message}`);
  }
  return await response.json();
}

/**
 * Fetch aggregated portfolio dashboard metrics.
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch(buildUrl('/dashboard/stats'), {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || response.statusText;
    throw new Error(`Failed to fetch dashboard stats (status ${response.status}): ${message}`);
  }
  return await response.json();
}

/**
 * Seed database with sample demo projects, tasks, and users.
 */
export async function seedDatabase(force = false): Promise<{ message: string }> {
  const response = await fetch(buildUrl('/seed'), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ force }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || response.statusText;
    throw new Error(`Failed to seed database (status ${response.status}): ${message}`);
  }
  return await response.json();
}



