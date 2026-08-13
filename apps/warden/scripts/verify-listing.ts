import { KeeperHubClient } from "../src/keeperhub-client";

async function main() {
  const client = new KeeperHubClient();
  console.log("Searching marketplace for Warden...");
  
  const searchRes = await client.callTool("search_workflows", {
    query: "Warden",
    sort: "recent"
  });
  
  const contentText = searchRes.content?.find((c: any) => c.type === "text")?.text;
  let parsed = [];
  try {
    parsed = JSON.parse(contentText || "[]");
  } catch (e) {
    console.error("Failed to parse search response:", contentText);
  }
  
  const wardenListing = parsed.find((w: any) => w.slug === "warden-guarded-gateway");
  if (wardenListing) {
    console.log("✅ Success! Warden listing found:");
    console.log(JSON.stringify(wardenListing, null, 2));
  } else {
    console.log("❌ Warden listing not found in the search results.");
    console.log("Raw results:");
    console.log(parsed);
  }
}

main().catch(console.error);
