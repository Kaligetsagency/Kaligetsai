# Kaligetsai
# Super Agent Framework

An autonomous, self-improving orchestration agent built with Node.js, Express, TypeScript, and Prisma. 

This framework acts as the "hands and eyes" for Large Language Models (like Gemini). It uses a ReAct (Reasoning + Acting) loop to dynamically generate bash scripts, execute system commands, use custom tools, and self-correct based on error outputs.

## Features
- **ReAct Execution Loop**: The agent can plan, write code, execute it on the host system, observe the output, and loop until the task is complete.
- **Dynamic Tool Registry**: The agent can write its own tools and save them to the PostgreSQL database for future use.
- **Memory Storage**: Task history and results are stored in a database to provide context for future operations.
- **Web Dashboard**: A clean, single-page Tailwind UI to monitor execution logs and assign tasks.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (running locally or via a cloud provider)
- A Gemini API Key (or an equivalent LLM provider)

### 2. Installation
Clone the repository and install the dependencies:
\`\`\`bash
git clone https://github.com/your-username/super-agent-framework.git
cd super-agent-framework
npm install
\`\`\`

### 3. Environment Setup
Create a `.env` file in the root directory:
\`\`\`env
DATABASE_URL="postgresql://username:password@localhost:5432/agent_db"
GEMINI_API_KEY="your-gemini-api-key"
PORT=3000
\`\`\`

### 4. Database Initialization
Push the Prisma schema to your PostgreSQL database and generate the client:
\`\`\`bash
npx prisma db push
npx prisma generate
\`\`\`

### 5. Run the Server
Start the development server:
\`\`\`bash
npm run dev
\`\`\`
Visit `http://localhost:3000` to access the Agent Dashboard.

---

## 🚂 Deployment (Railway)

Railway is the fastest way to get this agent running in the cloud with a managed PostgreSQL database.



### Step 1: Push to GitHub
Commit your code and push it to a new GitHub repository.

### Step 2: Create a Railway Project
1. Log in to your [Railway Dashboard](https://railway.app/).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository. Railway will automatically detect the Node.js environment and start building. *(Note: The initial build will fail because the database isn't attached yet. This is normal).*

### Step 3: Add PostgreSQL
1. In your Railway project canvas, click **New** -> **Database** -> **Add PostgreSQL**.
2. Railway will automatically inject the `DATABASE_URL` environment variable into your Node.js application.

### Step 4: Add Environment Variables
1. Click on your web application service in the Railway canvas.
2. Navigate to the **Variables** tab.
3. Add your `GEMINI_API_KEY`.
4. Add the `PORT` variable and set it to `3000`.

### Step 5: Trigger Build & Set Public URL
1. Navigate to the **Settings** tab of your web service.
2. Under the **Networking** section, click **Generate Domain**.
3. Railway will now redeploy your app (which includes automatically running `npx prisma generate && tsc` based on the `build` script in `package.json`).

Once deployed, visit your generated public URL to access your live agent dashboard!

---

## ⚠️ Security Warning

**This framework executes dynamic bash commands on its host machine.** When deployed to Railway, the agent runs inside an isolated Docker container, which mitigates the risk of it accessing your personal files. 

However, **do not run this framework locally with sudo privileges** or on a machine containing sensitive, unbacked-up data, as the AI has full read/write access to the directory it is executed in.
