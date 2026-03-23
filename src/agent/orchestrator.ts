import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

// Promisify exec so we can use async/await
const execAsync = promisify(exec);

// Initialize the LLM
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

export async function runAgentLoop(objective: string, prisma: PrismaClient) {
  console.log(`\n🎯 [NEW TASK] Objective: ${objective}`);
  
  // Fetch dynamic tools from DB
  const availableTools = await prisma.customTool.findMany({
    where: { isEnabled: true }
  });
  const toolDescriptions = availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n');

  // Agent Memory Array (The Context Window)
  let conversationHistory = `You are an autonomous Node.js agent running on a server.
Your objective is: "${objective}"

You have access to the following dynamic tools:
${toolDescriptions || "No custom tools available yet."}
You also have access to a built-in tool: "BASH_COMMAND".

You must respond ONLY with a valid JSON object in the following format:
{
  "thought": "Your internal reasoning about what to do next",
  "action": "BASH_COMMAND" or "TOOL_NAME" or "DONE",
  "payload": "The bash code to run, the tool argument, or the final summary if DONE"
}`;

  let isComplete = false;
  let loopCount = 0;
  const maxLoops = 10; // Failsafe to prevent infinite loops
  const actionsTaken: any[] = [];

  while (!isComplete && loopCount < maxLoops) {
    loopCount++;
    console.log(`\n⏳ [LOOP ${loopCount}] Thinking...`);

    try {
      // 1. PLAN: Ask the LLM what to do next based on the history
      const result = await model.generateContent(conversationHistory);
      let responseText = result.response.text();
      
      // Clean the response to ensure it's pure JSON (removing markdown blocks if present)
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const llmDecision = JSON.parse(responseText);
      console.log(`🧠 [THOUGHT] ${llmDecision.thought}`);
      console.log(`🛠️  [ACTION] ${llmDecision.action} | Payload: ${llmDecision.payload}`);

      actionsTaken.push(llmDecision);

      // 2. ACT: Execute the requested action
      let observation = "";

      if (llmDecision.action === "DONE") {
        isComplete = true;
        observation = "Task marked as complete by agent.";
        console.log(`✅ [COMPLETE] Result: ${llmDecision.payload}`);
      } 
      else if (llmDecision.action === "BASH_COMMAND") {
        try {
          // ⚠️ SECURITY WARNING: In production, this should run inside a Docker container or sandbox.
          const { stdout, stderr } = await execAsync(llmDecision.payload);
          observation = stdout || stderr || "Command executed successfully with no output.";
        } catch (error: any) {
          // If the bash command fails, we feed the error back so the LLM can self-correct!
          observation = `ERROR EXECUTING COMMAND: ${error.message}`;
        }
      } 
      else {
        // Handle custom tools from the database here
        observation = `Tool ${llmDecision.action} executed (Logic to be implemented).`;
      }

      console.log(`👀 [OBSERVATION] \n${observation.substring(0, 200)}...`);

      // 3. OBSERVE: Update the history with what just happened so the LLM knows the result
      conversationHistory += `\n\nAgent Action Taken: ${JSON.stringify(llmDecision)}
System Observation: ${observation}
What is your next step? Remember, output ONLY JSON.`;

    } catch (error) {
      console.error(`❌ [ERROR] Failed to parse LLM output or execute step:`, error);
      conversationHistory += `\n\nSYSTEM ERROR: You returned invalid JSON or caused a crash. Please fix your formatting and try again.`;
    }
  }

  // 4. MEMORIZE: Save the completed task to the database for future reference
  await prisma.taskMemory.create({
    data: {
      objective,
      actionsTaken: JSON.stringify(actionsTaken),
      result: isComplete ? 'Success' : 'Failed - Hit max loops',
    }
  });

  console.log(`💾 [SAVED] Task stored in Vector/Postgres memory.`);
}
