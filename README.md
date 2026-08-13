# Warden - Guarded Execution Gateway 🛡️

**Warden** is a single guarded-execution gateway, built on top of KeeperHub, designed to solve the "Last Mile" problem for autonomous AI agents: safe, observable, and governed onchain execution. 

Currently, the KeeperHub marketplace is full of read-only analyzers (risk scores, yield comparisons, etc.). **Warden is the first execution-shaped listing.** It is a paid middleware service that other agents call when they want something executed onchain, but don't want to trust their own unconstrained judgment—or an attacker's injected instructions—with raw signing power.

## 📖 The Vision

Most AI agent hackathons reward reasoning: an agent that decides something clever. The harder problem is what happens next. Agents can detect and decide, but they all hit the same wall when they need to move value onchain: *How do we ensure they don't get drained by a hallucination or a prompt injection attack?*

Warden sits perfectly between the Agent's decision and the Blockchain's execution. When an agent requests an action, Warden doesn't just trust the agent's "stated intent". Instead, Warden:
1. **Simulates** the real effect of the transaction using KeeperHub's execution layer.
2. **Evaluates** the simulated outcome against a strict, layered Policy Engine (trailing averages, anomaly detection, hard caps, and allow-lists).
3. **Acts** by either executing the transaction cleanly, halting it completely, or holding it in a secure queue for human oversight.

Warden proves that AI agent onchain activity can be governed safely, intuitively, and asynchronously.

## 🔗 Live Links & Proof of Execution

We didn't just build a demo; we executed real value onchain using KeeperHub's MCP protocol.

- **Marketplace Listing**: [Warden Guarded Gateway on KeeperHub](https://app.keeperhub.com/workflows/warden-guarded-gateway)
- **Proof of Execution (Transaction Hash)**: [0xe7376bca6a35628b6b25451d6b27c6b24cd44522e8216eaf169137ebdd2b93d2](https://sepolia.etherscan.io/tx/0xe7376bca6a35628b6b25451d6b27c6b24cd44522e8216eaf169137ebdd2b93d2)

## 🏗️ Architecture

The project is cleanly separated into three components so the demo tells its own story:

1. **The Client Agent (`apps/client-agent`)**  
   A lightweight, Azure OpenAI-powered autonomous script simulating a real-world entity with spending power. It has a reason to spend money, but connects to the Warden API to execute its transactions instead of holding its own private keys.

2. **The Warden Gateway (`apps/warden`)**  
   A Node.js backend using Express and MongoDB. It receives intents from the agent, simulates the transaction through KeeperHub's MCP API, checks it against the Policy Engine, and takes action (`APPROVE`, `HOLD`, or `REJECT`). All activity is immutably stored in an `AuditLog`.

3. **The Oversight Dashboard (`apps/dashboard`)**  
   A sleek Next.js & Tailwind dashboard that visualizes the `AuditLog` of the gateway. Human operators can view real-time activity and manually approve or reject anomalous transactions held by the policy engine.

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v22+)
- MongoDB (Local or Atlas)

### 1. Install Dependencies
This project uses npm workspaces. Run this from the root directory:
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
KEEPERHUB_API_KEY=kh_...
KEEPERHUB_MCP_URL=https://app.keeperhub.com/mcp
TARGET_CHAIN_ID=11155111
MONGODB_URI=mongodb+srv://...

AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://testconsulting.openai.azure.com/
```

### 3. Run the Warden Gateway
From the root directory:
```bash
cd apps/warden
npm run dev
# The gateway API will start on http://localhost:3001
```

### 4. Run the Dashboard
From the root directory, in a new terminal:
```bash
cd apps/dashboard
npm run dev
# The Next.js app will start on http://localhost:3000
```

### 5. Trigger the Agent (Testing)
Open `http://localhost:3000` to access the Warden Dashboard. You can seamlessly trigger "Routine" and "Adversarial" transactions directly from the UI to watch the Policy Engine authorize or trap the actions in real-time.

## 🏆 Hackathon Alignment: Agents Onchain

Warden directly attacks the hackathon's core premise: **Execution is weighted heavily.** 
By leveraging KeeperHub's MCP server integration for tools (`execute_transfer`, `get_spending_limits`) and the Workflow builder listing mechanism (`create_workflow`, `list_workflow`), Warden is a working, reliable execution layer that fills the final gap between AI reasoning and onchain reality.
