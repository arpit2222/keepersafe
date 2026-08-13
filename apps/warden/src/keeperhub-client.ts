import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export class KeeperHubClient {
  private apiKey: string;
  private mcpUrl: string;
  private sessionId: string | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.apiKey = process.env.KEEPERHUB_API_KEY || "";
    this.mcpUrl = process.env.KEEPERHUB_MCP_URL || "";

    if (!this.apiKey || !this.mcpUrl) {
      throw new Error("Missing KEEPERHUB_API_KEY or KEEPERHUB_MCP_URL");
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.sessionId) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const headers = new Headers({
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      });

      const initRes = await fetch(this.mcpUrl, {
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

      if (!initRes.ok) {
        const text = await initRes.text();
        throw new Error(`Initialize failed: ${initRes.status} ${text}`);
      }

      const sessionId = initRes.headers.get("mcp-session-id");
      if (!sessionId) {
        const text = await initRes.text();
        throw new Error(`No mcp-session-id header returned. Status: ${initRes.status}. Body: ${text}`);
      }
      
      headers.set("mcp-session-id", sessionId);

      await fetch(this.mcpUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized"
        })
      });

      this.sessionId = sessionId;
    })();

    await this.initPromise;
  }

  public async callTool(toolName: string, args: Record<string, any>): Promise<any> {
    await this.ensureInitialized();

    const res = await fetch(this.mcpUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "mcp-session-id": this.sessionId!
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args
        }
      })
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(`Tool ${toolName} error: ${JSON.stringify(data.error)}`);
    }

    if (data.result?.isError) {
      throw new Error(`Tool ${toolName} execution error: ${JSON.stringify(data.result.content)}`);
    }
    
    return data.result;
  }

  public async simulateTransfer(to: string, amount: string, token?: string) {
    const args: any = {
      chain_id: process.env.TARGET_CHAIN_ID || "11155111",
      to_address: to,
      amount: amount.toString(),
      simulate: true
    };
    if (token) args.token_address = token;

    const result = await this.callTool("execute_transfer", args);
    // Parse the textual content returned by MCP
    const content = result.content.find((c: any) => c.type === "text")?.text;
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content };
    }
  }

  public async executeTransfer(to: string, amount: string, token?: string, idempotencyKey?: string) {
    const args: any = {
      chain_id: process.env.TARGET_CHAIN_ID || "11155111",
      to_address: to,
      amount: amount.toString(),
      simulate: false
    };
    if (token) args.token_address = token;
    if (idempotencyKey) args.idempotency_key = idempotencyKey;

    const result = await this.callTool("execute_transfer", args);
    const content = result.content.find((c: any) => c.type === "text")?.text;
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content };
    }
  }

  public async getExecutionStatus(executionId: string) {
    const result = await this.callTool("get_direct_execution_status", { execution_id: executionId });
    const content = result.content.find((c: any) => c.type === "text")?.text;
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content };
    }
  }

  public async getSpendingLimits() {
    const result = await this.callTool("get_spending_limits", {});
    const content = result.content.find((c: any) => c.type === "text")?.text;
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content };
    }
  }
}
