"use client";

import { useState, useEffect } from "react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAgentConnected: boolean;
}

export default function OnboardingModal({ isOpen, onClose, isAgentConnected }: OnboardingModalProps) {
  const [activeTab, setActiveTab] = useState<"ts" | "python">("ts");
  const [apiKey] = useState(`wdn_live_${Math.random().toString(36).substring(2, 15)}`);
  
  if (!isOpen) return null;

  const tsCode = `import { WardenClient } from "@warden/sdk";

const warden = new WardenClient({ apiKey: "${apiKey}" });

// Wrap your agent's execution intent
const result = await warden.executeIntent({
  action: { 
    to_address: "0xDefiProtocol...", 
    amount: "1.5" 
  },
  statedIntent: "Swap ETH for USDC on Uniswap"
});

console.log(result.status); // "EXECUTED" | "HELD" | "REJECTED"`;

  const pyCode = `from warden_sdk import WardenClient

warden = WardenClient(api_key="${apiKey}")

# Wrap your agent's execution intent
result = warden.execute_intent(
    action={
        "to_address": "0xDefiProtocol...",
        "amount": "1.5"
    },
    stated_intent="Swap ETH for USDC on Uniswap"
)

print(result.status) # "EXECUTED" | "HELD" | "REJECTED"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">Connect Your Agent</h2>
            <p className="text-neutral-400 mt-1">Wrap your agent's transactions with Warden in seconds.</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Status Banner */}
        <div className={\`p-4 text-sm font-medium flex items-center gap-3 transition-colors duration-500 \${isAgentConnected ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/10 text-amber-400"}\`}>
          <div className="relative flex h-3 w-3">
            {!isAgentConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>}
            <span className={\`relative inline-flex rounded-full h-3 w-3 \${isAgentConnected ? "bg-emerald-500" : "bg-amber-500"}\`}></span>
          </div>
          {isAgentConnected ? "Agent Connected Successfully! You can now close this window." : "Listening for first agent heartbeat..."}
        </div>

        {/* Code Section */}
        <div className="p-6">
          <div className="flex gap-4 mb-4">
            <button 
              onClick={() => setActiveTab("ts")}
              className={\`px-4 py-2 text-sm font-medium rounded-lg transition-colors \${activeTab === "ts" ? "bg-white/10 text-white" : "text-neutral-500 hover:text-white"}\`}
            >
              TypeScript
            </button>
            <button 
              onClick={() => setActiveTab("python")}
              className={\`px-4 py-2 text-sm font-medium rounded-lg transition-colors \${activeTab === "python" ? "bg-white/10 text-white" : "text-neutral-500 hover:text-white"}\`}
            >
              Python (LangChain)
            </button>
          </div>

          <div className="relative group">
            <pre className="bg-black/50 p-6 rounded-xl border border-white/5 overflow-x-auto text-sm text-neutral-300 font-mono">
              <code>{activeTab === "ts" ? tsCode : pyCode}</code>
            </pre>
            <button 
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-md text-white opacity-0 group-hover:opacity-100 transition-all"
              onClick={() => navigator.clipboard.writeText(activeTab === "ts" ? tsCode : pyCode)}
            >
              Copy
            </button>
          </div>
          
          <p className="text-xs text-neutral-500 mt-4">
            * This requires your agent to have permissions to make external network requests to Warden.
          </p>
        </div>
      </div>
    </div>
  );
}
