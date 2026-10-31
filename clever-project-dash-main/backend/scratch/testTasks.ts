// backend/scratch/testTasks.ts
import { connectDB } from '../src/config/db';
import { Project } from '../src/models/Project';
import { User, UserRole } from '../src/models/User';
import { createTask, getTasksByProject, getTaskById, updateTask, deleteTask } from '../src/services/taskService';
import mongoose from 'mongoose';

const run = async () => {
  await connectDB();
  console.log('DB connected');

  // 1. Invalid project ID
  try {
    await createTask('invalid-id', { title: 'Test', description: 'desc', status: 'TODO', priority: 'MEDIUM' } as any, 'someUserId');
  } catch (e:any) {
    console.log('Create task invalid project ID →', e.message);
  }

  // 2. Invalid task ID fetch
  try {
    await getTaskById('invalid-task-id', 'someUser', UserRole.ADMIN);
  } catch (e:any) {
    console.log('Get task invalid ID →', e.message);
  }

  // 3. Permission test: create task as TEAM_MEMBER on a real project (if any)
  const anyProject = await Project.findOne().exec();
  const anyUser = await User.findOne().exec();
  if (anyProject && anyUser) {
    // ensure user is TEAM_MEMBER
    await User.findByIdAndUpdate(anyUser._id, { role: UserRole.TEAM_MEMBER });
    try {
      await createTask(anyProject._id.toString(), { title: 'Team task' } as any, anyUser._id.toString());
    } catch (e:any) {
      console.log('TEAM_MEMBER create task →', e.message);
    }
  } else {
    console.log('No project or user found for permission test');
  }

  // cleanup
  await mongoose.disconnect();
};

run().catch(err => console.error(err));
