import { KeeperHubClient } from "../src/keeperhub-client";

async function main() {
  const client = new KeeperHubClient();
  console.log("Starting Phase 5: Publish Listing");
  
  // Create a placeholder workflow that acts as our gateway definition
  const createRes = await client.callTool("create_workflow", {
    name: "Warden Guarded Execution Gateway",
    description: "An intelligent middleware that wraps KeeperHub to provide policy-based transaction holding, anomaly detection, and audited execution for AI agents.",
    nodes: [
      { id: "trigger-1", type: "manualTrigger", data: { name: "Agent Request" } },
      { id: "action-1", type: "httpAction", data: { url: "http://localhost:3001/api/warden/request" } }
    ],
    edges: [
      { id: "edge-1", source: "trigger-1", target: "action-1" }
    ],
    enabled: true
  });
  
  const contentText = createRes.content?.find((c: any) => c.type === "text")?.text;
  let parsedCreateRes: any = {};
  try {
    parsedCreateRes = JSON.parse(contentText || "{}");
  } catch (e) {
    console.error("Failed to parse create_workflow response:", contentText);
  }
  
  const workflowId = parsedCreateRes.workflow?.id || parsedCreateRes.id || parsedCreateRes.workflowId;
  if (!workflowId) {
    console.log("Raw create response:", parsedCreateRes);
    throw new Error("Failed to extract workflowId from create_workflow response.");
  }
  
  console.log(`Created workflow with ID: ${workflowId}`);
  
  // List the workflow on the marketplace
  const listRes = await client.callTool("list_workflow", {
    workflowId: workflowId,
    slug: "warden-guarded-gateway",
    category: "execution",
    chain: "multi-chain",
    workflowType: "read",
    inputSchema: { type: "object" }
  });
  
  console.log("Published to Marketplace!");
  console.log("Listing URL should be accessible at https://app.keeperhub.com/workflows/warden-guarded-gateway");
  console.log(listRes);
}

main().catch(console.error);
