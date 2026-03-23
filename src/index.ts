import express from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { runAgentLoop } from './agent/orchestrator';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', framework: 'online' });
});

// Endpoint to fetch task history for the UI
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await prisma.taskMemory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Endpoint to submit a new task
app.post('/api/task', async (req, res) => {
  const { objective } = req.body;
  
  if (!objective) {
    return res.status(400).json({ error: 'Objective is required.' });
  }

  res.status(202).json({ message: 'Task received. Agent loop started.', objective });

  // Start the background execution loop
  runAgentLoop(objective, prisma).catch(console.error);
});

app.listen(port, () => {
  console.log(`🚀 Orchestration framework running on port ${port}`);
});
