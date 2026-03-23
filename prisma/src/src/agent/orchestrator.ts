import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

// Initialize the LLM (The "Brain")
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

export async function runAgentLoop(objective: string, prisma: PrismaClient) {
  console.log(`[LOOP START] Objective: ${objective}`);
  
  // 1. Fetch available tools from the database (The "Hands")
  const availableTools = await prisma.customTool.findMany({
    where: { isEnabled: true }
  });

  const toolDescriptions = availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n');

  // 2. Prompt the LLM to Plan the next step
  const prompt = `
    You are an autonomous agent running on a Node.js server.
    Your objective is: "${objective}"
    
    Here are the tools currently available to you:
    ${toolDescriptions || "No custom tools yet. You can only use base commands."}
    
    Respond with a JSON object detailing your next action:
    {
      "action": "TOOL_NAME_OR_BASH_COMMAND",
      "payload": "arguments or code to execute"
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log(`[LLM PLAN] Response:\n${responseText}`);
    
    // 3. (Future Step) Parse the JSON, execute the action locally, 
    // observe the result, and loop back or save to TaskMemory.
    
    // For now, we just save a placeholder memory to verify DB connectivity
    await prisma.taskMemory.create({
      data: {
        objective,
        actionsTaken: responseText,
        result: 'Pending implementation of local executor',
      }
    });

    console.log(`[LOOP END] Memory saved.`);
  } catch (error) {
    console.error(`[LOOP ERROR] Failed to execute agent step:`, error);
  }
}
