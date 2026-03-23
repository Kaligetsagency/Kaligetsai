import express from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { runAgentLoop } from './agent/orchestrator';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint (Railway relies on this to know if the app is alive)
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', framework: 'online' });
});

// The main endpoint where you give the agent a task
app.post('/api/task', async (req, res) => {
  const { objective } = req.body;
  
  if (!objective) {
    return res.status(400).json({ error: 'Objective is required.' });
  }

  // Acknowledge the request immediately so the web UI doesn't hang
  res.status(202).json({ message: 'Task received. Agent loop started.', objective });

  // Start the background execution loop
  runAgentLoop(objective, prisma).catch(console.error);
});

app.listen(port, () => {
  console.log(`🚀 Orchestration framework running on port ${port}`);
});
