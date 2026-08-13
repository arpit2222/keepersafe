"use client";

import { useEffect, useState } from "react";
import OnboardingModal from "../components/OnboardingModal";

export default function Dashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isAgentConnected, setIsAgentConnected] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/warden/audit`);
      const data = await res.json();
      setLogs(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id: string) => {
    await fetch(`${API_URL}/api/warden/held/${id}/approve`, { method: "POST" });
    fetchLogs();
  };

  const handleReject = async (id: string) => {
    await fetch(`${API_URL}/api/warden/held/${id}/reject`, { method: "POST" });
    fetchLogs();
  };

  const simulateRoutine = async () => {
    await fetch(`${API_URL}/api/warden/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: { to_address: "0x000000000000000000000000000000000000dead", amount: "0.0001" },
        requestedBy: "DashboardTrigger",
        statedIntent: "Routine Payment"
      })
    });
    // Trigger the connected animation if the modal is open
    if (isOnboardingOpen) {
      setIsAgentConnected(true);
    }
    fetchLogs();
  };

  const simulateAdversarial = async () => {
    await fetch(`${API_URL}/api/warden/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: { to_address: "0x1111111111111111111111111111111111111111", amount: "0.0005" },
        requestedBy: "DashboardTrigger",
        statedIntent: "URGENT OVERRIDE"
      })
    });
    // Trigger the connected animation if the modal is open
    if (isOnboardingOpen) {
      setIsAgentConnected(true);
    }
    fetchLogs();
  };

  const openOnboarding = () => {
    setIsAgentConnected(false); // Reset connection state when opening
    setIsOnboardingOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-orange-500/30 pb-20">
      <OnboardingModal 
        isOpen={isOnboardingOpen} 
        onClose={() => setIsOnboardingOpen(false)} 
        isAgentConnected={isAgentConnected}
      />
      
      <main className="max-w-6xl mx-auto p-8">
        <header className="mb-8 flex justify-between items-end border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-orange-400 to-orange-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              Warden
            </h1>
            <p className="text-neutral-400 mt-2 font-medium">Guarded Execution Gateway</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={openOnboarding}
              className="px-4 py-2 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 hover:scale-105 duration-300 shadow-[0_0_15px_rgba(249,115,22,0.15)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Connect Agent
            </button>
            <button 
              onClick={simulateRoutine}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all hover:scale-105 duration-300"
            >
              Trigger Routine
            </button>
            <button 
              onClick={simulateAdversarial}
              className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm font-medium transition-all hover:scale-105 duration-300"
            >
              Trigger Adversarial
            </button>
          </div>
        </header>

        {/* Vision Section */}
        <section className="mb-12 p-8 rounded-2xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity duration-700">
             <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-orange-400 mb-4 flex items-center gap-2">
            The Last Mile for AI Agents
          </h2>
          <p className="text-neutral-300 text-lg leading-relaxed max-w-3xl">
            Warden solves the hardest problem in Agentic Web3: <strong>Safe Execution</strong>. It sits perfectly between your AI Agent's decision and the blockchain. Instead of blindly trusting a hallucinated intent, Warden simulates the real effect via KeeperHub's MCP protocol, evaluates it against a strict layered Policy Engine, and securely governs the transaction onchain.
          </p>
        </section>

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              Live Activity Feed
            </h2>
            
            {loading ? (
              <div className="text-neutral-500 animate-pulse">Loading logs...</div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log._id} className="p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg transition-all duration-300 hover:bg-white/[0.08] hover:-translate-y-1 hover:shadow-orange-500/5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wider ${
                            log.status === 'HELD' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]' :
                            log.status === 'EXECUTED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]' :
                            log.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                          }`}>
                            {log.status}
                          </span>
                          <span className="text-sm text-neutral-500 font-medium">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold mt-2 text-white/90">{log.action.amount} ETH to {log.action.to_address.slice(0,8)}...</h3>
                      </div>
                      
                      {log.status === 'HELD' && (
                        <div className="flex gap-2 opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]">
                          <button 
                            onClick={() => handleReject(log._id)}
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-semibold transition-all duration-300 border border-red-500/20 hover:scale-105"
                          >
                            Reject
                          </button>
                          <button 
                            onClick={() => handleApprove(log._id)}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-105"
                          >
                            Approve
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-neutral-400 bg-black/40 p-3 rounded-lg border border-white/5 font-mono overflow-hidden">
                      <span className="text-orange-400/80 font-semibold mr-2">Reason:</span> {log.reason}
                    </div>
                  </div>
                ))}
                
                {logs.length === 0 && (
                  <div className="text-center py-16 text-neutral-500 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                    No activity yet. Trigger an action above to start simulating.
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="col-span-1">
            <div className="sticky top-8 p-6 rounded-2xl bg-gradient-to-b from-orange-500/5 to-transparent border border-orange-500/10 shadow-2xl">
              <h2 className="text-lg font-bold mb-6 text-white/90 border-b border-orange-500/20 pb-3">Active Policies</h2>
              <div className="space-y-4 text-sm text-neutral-300">
                <div className="flex justify-between items-center pb-3 border-b border-white/5 transition-colors hover:text-orange-300 cursor-default">
                  <span className="text-neutral-400">Per-TX Cap</span>
                  <span className="font-mono font-semibold">$1,000</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/5 transition-colors hover:text-orange-300 cursor-default">
                  <span className="text-neutral-400">Anomaly Check</span>
                  <span className="font-mono font-semibold">5x Trailing Avg</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/5 transition-colors hover:text-orange-300 cursor-default">
                  <span className="text-neutral-400">Allow List</span>
                  <span className="font-mono font-semibold text-emerald-400">Enforced</span>
                </div>
                <div className="flex justify-between items-center pt-2 transition-colors hover:text-orange-300 cursor-default">
                  <span className="text-neutral-400">Network</span>
                  <span className="font-mono font-semibold text-orange-400">Sepolia</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
