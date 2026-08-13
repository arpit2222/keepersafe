import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function main() {
  const apiKey = process.env.KEEPERHUB_API_KEY;
  const mcpUrl = process.env.KEEPERHUB_MCP_URL;

  if (!apiKey || !mcpUrl) {
    console.error("Missing KEEPERHUB_API_KEY or KEEPERHUB_MCP_URL in environment.");
    process.exit(1);
  }

  console.log(`Connecting to MCP server at ${mcpUrl}...`);

  const headers = new Headers({
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  });

  // 1. Initialize
  const initRes = await fetch(mcpUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "warden", version: "1.0.0" }
      }
    })
  });
  
  if (!initRes.ok) throw new Error(`Initialize failed: ${initRes.status}`);
  
  const sessionId = initRes.headers.get("mcp-session-id");
  if (!sessionId) throw new Error("No mcp-session-id header returned");
  headers.set("mcp-session-id", sessionId);

  // 2. notifications/initialized
  await fetch(mcpUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized"
    })
  });

  // 3. tools/list
  const toolsRes = await fetch(mcpUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list"
    })
  });
  
  const toolsData = await toolsRes.json();
  const tools = toolsData.result?.tools || [];
  
  console.log(`Found ${tools.length} tools.`);
  for (const tool of tools) {
    console.log(`- ${tool.name}: ${tool.description}`);
  }

  const docsPath = path.resolve(__dirname, "../../../docs");
  if (!fs.existsSync(docsPath)) {
    fs.mkdirSync(docsPath, { recursive: true });
  }
  const outputPath = path.join(docsPath, "keeperhub-tools.json");
  fs.writeFileSync(outputPath, JSON.stringify(toolsData, null, 2));
  
  console.log(`\nTool schemas saved to ${outputPath}`);
}

main().catch(console.error);
