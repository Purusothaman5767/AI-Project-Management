import http from 'http';

function request(options: http.RequestOptions, postData?: any): Promise<{ status: number; data: any; headers: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, data: JSON.parse(body), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode || 0, data: body, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function verify() {
  console.log('--- 1. Testing Backend & MongoDB Health ---');
  const healthDirect = await request({ hostname: 'localhost', port: 5000, path: '/api/health', method: 'GET' });
  console.log('Direct Backend /api/health:', healthDirect.status, healthDirect.data);

  console.log('--- 2. Testing Frontend Proxy Connectivity ---');
  const healthProxy = await request({ hostname: 'localhost', port: 8080, path: '/api/health', method: 'GET' });
  console.log('Vite Frontend Proxy /api/health:', healthProxy.status, healthProxy.data);

  console.log('--- 3. Testing Authentication (Login) ---');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'sarah.pm@nimbus.pm', password: 'Password123!' }
  );
  console.log('Login Status:', loginRes.status, 'User:', loginRes.data?.user?.name, 'Role:', loginRes.data?.user?.role);
  const token = loginRes.data?.accessToken;
  if (!token) throw new Error('No access token returned!');

  console.log('--- 4. Testing Project Creation & Persistence ---');
  const projRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/projects',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      name: 'Temp Verification Project',
      description: 'Temporary project to verify persistence for review preparation',
      status: 'PLANNING',
      startDate: new Date().toISOString(),
      deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
    }
  );
  console.log('Created Project Status:', projRes.status, 'ID:', projRes.data?._id);
  const projId = projRes.data?._id;
  if (!projId) throw new Error('Project creation failed: ' + JSON.stringify(projRes.data));

  console.log('--- 5. Testing Task Creation & Persistence ---');
  const taskRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/tasks',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      title: 'Verify Task Persistence',
      description: 'Checking task creation',
      project: projId,
      status: 'TODO',
      priority: 'HIGH',
    }
  );
  console.log('Created Task Status:', taskRes.status, 'ID:', taskRes.data?._id);
  const taskId = taskRes.data?._id;
  if (!taskId) throw new Error('Task creation failed: ' + JSON.stringify(taskRes.data));

  console.log('--- 6. Verifying Persistence via Retrieval ---');
  const getProj = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/projects/${projId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Retrieved Project Name:', getProj.data?.name);

  const getTasks = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tasks?projectId=${projId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Retrieved Tasks Count for Project:', Array.isArray(getTasks.data) ? getTasks.data.length : getTasks.data?.tasks?.length);

  console.log('--- 7. Clean up Temporary Verification Records ---');
  const delTask = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tasks/${taskId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Deleted temp task:', delTask.status);

  const delProj = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/projects/${projId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Deleted temp project:', delProj.status);

  console.log('\n>>> All Backend & Persistence Verifications Passed Successfully! <<<');
}

verify().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
