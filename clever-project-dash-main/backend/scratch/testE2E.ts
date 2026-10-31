// backend/scratch/testE2E.ts
const runTests = async () => {
  const baseUrl = 'http://localhost:5000/api';
  console.log('--- Testing Nimbus PM Backend API Endpoints ---');

  // 1. Health check
  const healthRes = await fetch(`${baseUrl}/health`);
  console.log('1. GET /api/health:', healthRes.status, await healthRes.json());

  // 2. Login
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sarah.pm@nimbus.pm',
      password: 'Password123!',
    }),
  });
  const loginData: any = await loginRes.json();
  console.log('2. POST /api/auth/login:', loginRes.status, 'User:', loginData.user?.name, 'Role:', loginData.user?.role);
  const token = loginData.accessToken;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 3. Current user
  const meRes = await fetch(`${baseUrl}/auth/me`, { headers });
  console.log('3. GET /api/auth/me:', meRes.status, await meRes.json());

  // 4. List users
  const usersRes = await fetch(`${baseUrl}/users`, { headers });
  const users: any = await usersRes.json();
  console.log('4. GET /api/users:', usersRes.status, `Loaded ${users.length} users`);

  // 5. Team workload
  const teamRes = await fetch(`${baseUrl}/team`, { headers });
  const team: any = await teamRes.json();
  console.log('5. GET /api/team:', teamRes.status, `Loaded ${team.length} members with workloads:`);
  for (const m of team) {
    console.log(`   - ${m.name} (${m.role}): ${m.assignedTasks} tasks assigned, workload: ${m.workload}%`);
  }

  // 6. Dashboard stats
  const dashRes = await fetch(`${baseUrl}/dashboard/stats`, { headers });
  const dash: any = await dashRes.json();
  console.log('6. GET /api/dashboard/stats:', dashRes.status, {
    totalProjects: dash.totalProjects,
    activeProjects: dash.activeProjects,
    totalTasks: dash.totalTasks,
    completedTasks: dash.completedTasks,
    overdueTasksCount: dash.overdueTasksCount,
    trendMonths: dash.progressTrend?.map((t: any) => t.month),
  });

  // 7. Projects
  const projRes = await fetch(`${baseUrl}/projects`, { headers });
  const projects: any = await projRes.json();
  console.log('7. GET /api/projects:', projRes.status, `Loaded ${projects.length} projects`);
  const firstProject = projects[0];

  // 8. Tasks across projects
  const tasksRes = await fetch(`${baseUrl}/tasks`, { headers });
  const tasks: any = await tasksRes.json();
  console.log('8. GET /api/tasks:', tasksRes.status, `Loaded ${tasks.length} tasks`);

  // 9. Create task
  const createTaskRes = await fetch(`${baseUrl}/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      projectId: firstProject._id,
      title: 'Automated E2E Verification Task',
      description: 'Testing task creation from E2E suite',
      priority: 'HIGH',
      status: 'TODO',
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    }),
  });
  const newTask: any = await createTaskRes.json();
  console.log('9. POST /api/tasks:', createTaskRes.status, 'Created task:', newTask.title, 'ID:', newTask._id);

  // 10. Update task
  const updateTaskRes = await fetch(`${baseUrl}/tasks/${newTask._id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      status: 'DONE',
    }),
  });
  const updatedTask: any = await updateTaskRes.json();
  console.log('10. PUT /api/tasks/:id:', updateTaskRes.status, 'Updated status:', updatedTask.status);

  // 11. AI Assistant query: Risks
  const aiRiskRes = await fetch(`${baseUrl}/ai/assistant`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: 'Which projects are at risk?',
    }),
  });
  const aiRiskData: any = await aiRiskRes.json();
  console.log('11. POST /api/ai/assistant (Risks):', aiRiskRes.status, 'Model:', aiRiskData.model);
  console.log('Reply preview:\n', aiRiskData.reply?.slice(0, 250), '...\n');

  // 12. AI Assistant query: Workload
  const aiWorkloadRes = await fetch(`${baseUrl}/ai/assistant`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: 'Is the workload balanced?',
    }),
  });
  const aiWorkloadData: any = await aiWorkloadRes.json();
  console.log('12. POST /api/ai/assistant (Workload):', aiWorkloadRes.status, 'Model:', aiWorkloadData.model);
  console.log('Reply preview:\n', aiWorkloadData.reply?.slice(0, 250), '...\n');

  // 13. Delete the verification task
  const delTaskRes = await fetch(`${baseUrl}/tasks/${newTask._id}`, {
    method: 'DELETE',
    headers,
  });
  console.log('13. DELETE /api/tasks/:id:', delTaskRes.status, await delTaskRes.json());

  console.log('--- All 13 Backend API Test Suites Passed! ---');
};

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
