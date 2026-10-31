// backend/src/services/seedService.ts
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../models/User';
import { Project, ProjectStatus, ProjectPriority } from '../models/Project';
import { Task, TaskStatus, TaskPriority } from '../models/Task';

export interface SeedResult {
  usersCount: number;
  projectsCount: number;
  tasksCount: number;
  message: string;
}

export const seedDatabase = async (force = false): Promise<SeedResult> => {
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0 && !force) {
    return {
      usersCount: existingUsers,
      projectsCount: await Project.countDocuments(),
      tasksCount: await Task.countDocuments(),
      message: 'Database already contains data. Use force=true to re-seed.',
    };
  }

  // Clear existing collections if force re-seeding
  if (force) {
    await Task.deleteMany({});
    await Project.deleteMany({});
    await User.deleteMany({});
  }

  // 1. Create Users
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@nimbus.pm',
    passwordHash,
    role: UserRole.ADMIN,
  });

  const sarah = await User.create({
    name: 'Sarah Jenkins',
    email: 'sarah.pm@nimbus.pm',
    passwordHash,
    role: UserRole.PROJECT_MANAGER,
  });

  const alex = await User.create({
    name: 'Alex Morgan',
    email: 'alex.dev@nimbus.pm',
    passwordHash,
    role: UserRole.TEAM_MEMBER,
  });

  const elena = await User.create({
    name: 'Elena Rostova',
    email: 'elena.design@nimbus.pm',
    passwordHash,
    role: UserRole.TEAM_MEMBER,
  });

  const marcus = await User.create({
    name: 'Marcus Vance',
    email: 'marcus.qa@nimbus.pm',
    passwordHash,
    role: UserRole.TEAM_MEMBER,
  });

  const now = new Date();
  const pastDate = (days: number) => new Date(now.getTime() - days * 86400000);
  const futureDate = (days: number) => new Date(now.getTime() + days * 86400000);

  // 2. Create Projects
  const project1 = await Project.create({
    name: 'Mobile Banking App Redesign',
    description: 'Complete overhaul of the mobile consumer banking app with biometric authentication and streamlined transfers.',
    owner: sarah._id,
    members: [alex._id, elena._id, marcus._id],
    startDate: pastDate(25),
    deadline: futureDate(20),
    status: ProjectStatus.IN_PROGRESS,
    priority: ProjectPriority.HIGH,
  });

  const project2 = await Project.create({
    name: 'Cloud Infrastructure Migration',
    description: 'Migrate on-premise Kubernetes clusters to AWS EKS with multi-region failover and automated horizontal scaling.',
    owner: sarah._id,
    members: [alex._id, marcus._id],
    startDate: pastDate(40),
    deadline: futureDate(12),
    status: ProjectStatus.IN_PROGRESS,
    priority: ProjectPriority.CRITICAL,
  });

  const project3 = await Project.create({
    name: 'AI Customer Support Copilot',
    description: 'Internal generative assistant for tier-1 support agents to suggest answers and automate ticket triage.',
    owner: sarah._id,
    members: [elena._id, marcus._id],
    startDate: pastDate(10),
    deadline: futureDate(45),
    status: ProjectStatus.PLANNING,
    priority: ProjectPriority.MEDIUM,
  });

  const project4 = await Project.create({
    name: 'Design System v2 (Nebula)',
    description: 'Unified cross-platform UI component library, tokens, and Figma synchronization for frontend teams.',
    owner: sarah._id,
    members: [elena._id, alex._id],
    startDate: pastDate(60),
    deadline: pastDate(5),
    status: ProjectStatus.COMPLETED,
    priority: ProjectPriority.LOW,
  });

  // 3. Create Tasks
  const tasksData = [
    // Project 1 tasks
    {
      title: 'Biometric FaceID / TouchID Authentication',
      description: 'Integrate native secure enclave biometric auth for both iOS and Android builds.',
      project: project1._id,
      assignee: alex._id,
      creator: sarah._id,
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: pastDate(10),
    },
    {
      title: 'Account Dashboard Wireframes & Prototypes',
      description: 'High-fidelity mockups of recent transactions, spending breakdown, and quick actions.',
      project: project1._id,
      assignee: elena._id,
      creator: sarah._id,
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: pastDate(15),
    },
    {
      title: 'Instant P2P Transfer Microservice API',
      description: 'REST and WebSocket endpoints for low-latency peer-to-peer balance settlement.',
      project: project1._id,
      assignee: alex._id,
      creator: sarah._id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      dueDate: futureDate(5),
    },
    {
      title: 'End-to-End Encryption & Security Audit',
      description: 'Penetration testing and payload encryption verification for banking transactions.',
      project: project1._id,
      assignee: marcus._id,
      creator: sarah._id,
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      dueDate: futureDate(8),
    },
    {
      title: 'Push Notification Alerts for Suspicious Activity',
      description: 'Real-time alert webhooks integration with Apple APNS and Google FCM.',
      project: project1._id,
      assignee: alex._id,
      creator: sarah._id,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: futureDate(14),
    },

    // Project 2 tasks (Cloud Migration - with 1 overdue task to test alerts)
    {
      title: 'Database Sharding & Failover Configuration',
      description: 'Configure multi-AZ Aurora PostgreSQL read replicas and automatic disaster failover.',
      project: project2._id,
      assignee: alex._id,
      creator: sarah._id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      dueDate: pastDate(3), // Overdue!
    },
    {
      title: 'Docker Image Hardening and Vulnerability Scanning',
      description: 'Implement Trivy and Snyk scanning in the CI/CD deployment pipeline.',
      project: project2._id,
      assignee: marcus._id,
      creator: sarah._id,
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: pastDate(12),
    },
    {
      title: 'Terraform Infrastructure as Code Definition',
      description: 'Declare VPC, subnets, route tables, and NAT gateways in modular Terraform scripts.',
      project: project2._id,
      assignee: alex._id,
      creator: sarah._id,
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: pastDate(20),
    },
    {
      title: 'Stress & Load Testing Under 50k Concurrent Users',
      description: 'Run k6 distributed load testing scripts against the staging ingress gateway.',
      project: project2._id,
      assignee: marcus._id,
      creator: sarah._id,
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      dueDate: futureDate(7),
    },

    // Project 3 tasks (AI Support Copilot)
    {
      title: 'Knowledge Base Vector Ingestion Pipeline',
      description: 'Chunk and embed 500+ documentation articles into vector store for RAG retrieval.',
      project: project3._id,
      assignee: marcus._id,
      creator: sarah._id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: futureDate(18),
    },
    {
      title: 'Agent Chat UI Sidebar & Quick Suggestion Chips',
      description: 'Design the side-panel agent widget with confidence score badges and 1-click reply injection.',
      project: project3._id,
      assignee: elena._id,
      creator: sarah._id,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: futureDate(25),
    },
    {
      title: 'Tone and Factuality Guardrails Evaluation',
      description: 'Validate system prompts against hallucination and confidential data leakage test suites.',
      project: project3._id,
      assignee: marcus._id,
      creator: sarah._id,
      status: TaskStatus.TODO,
      priority: TaskPriority.CRITICAL,
      dueDate: futureDate(30),
    },

    // Project 4 tasks (Design System v2 - Completed)
    {
      title: 'Design System Color Tokens and WCAG Contrast Rules',
      description: 'Publish audited color tokens for light and dark themes with AAA contrast ratios.',
      project: project4._id,
      assignee: elena._id,
      creator: sarah._id,
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: pastDate(25),
    },
    {
      title: 'Accessible React Component Library Release',
      description: 'Package Button, Modal, Dropdown, Table, and Input components with Radix primitives.',
      project: project4._id,
      assignee: alex._id,
      creator: sarah._id,
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: pastDate(15),
    },
    {
      title: 'Interactive Storybook Documentation Portal',
      description: 'Deploy live component playground with interactive prop controls and copyable code snippets.',
      project: project4._id,
      assignee: elena._id,
      creator: sarah._id,
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      dueDate: pastDate(8),
    },
  ];

  await Task.insertMany(tasksData);

  return {
    usersCount: 5,
    projectsCount: 4,
    tasksCount: tasksData.length,
    message: 'Demo workspace successfully seeded with users, projects, and tasks.',
  };
};
