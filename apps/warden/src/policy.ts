export interface PolicyConfig {
  perTransactionCapUsd: number;
  dailyCapUsd: number;
  allowedCounterparties: string[];
  anomalyMultiplier: number;
}

export type PolicyDecision = "APPROVE" | "HOLD" | "REJECT";

export interface PolicyResult {
  decision: PolicyDecision;
  reason: string;
}

export class PolicyEngine {
  constructor(private config: PolicyConfig) {}

  public evaluate(
    simulatedEffect: any,
    orgSpendingLimits: any,
    trailingAverageUsd: number
  ): PolicyResult {
    // 1. Violates KeeperHub's limits or would revert
    if (simulatedEffect?.wouldRevert) {
      return {
        decision: "REJECT",
        reason: `KeeperHub simulation indicates the transaction would revert: ${simulatedEffect.revertReason || "Unknown reason"}`,
      };
    }
    
    // In a real scenario, we'd compare orgSpendingLimits (from get_spending_limits) 
    // against the simulatedEffect's USD value, but we rely on our own caps primarily here.
    
    const toAddress = (simulatedEffect?.to || "").toLowerCase();
    
    // 2. Is counterparty on the allow-list?
    const isAllowed = this.config.allowedCounterparties.some(
      (addr) => addr.toLowerCase() === toAddress
    );
    if (!isAllowed && toAddress) {
      return {
        decision: "REJECT",
        reason: `Counterparty ${toAddress} is not on the allow-list.`,
      };
    }

    // Determine value in USD. For this hackathon, we assume 1 ETH = $3000 to simplify,
    // or we can just use the token amounts if it's a stablecoin. 
    // Let's assume the simulatedEffect gives us `value` in WEI and it's ETH.
    const weiValue = BigInt(simulatedEffect?.value || "0");
    const ethValue = Number(weiValue) / 1e18;
    const usdValue = ethValue * 3000; // Mock ETH price

    // 3. Exceeds per-transaction cap
    if (usdValue > this.config.perTransactionCapUsd) {
      return {
        decision: "REJECT",
        reason: `Transaction value ($${usdValue.toFixed(2)}) exceeds per-transaction cap ($${this.config.perTransactionCapUsd}).`,
      };
    }

    // 4. Anomaly multiplier
    if (trailingAverageUsd > 0 && usdValue > trailingAverageUsd * this.config.anomalyMultiplier) {
      return {
        decision: "HOLD",
        reason: `Transaction value ($${usdValue.toFixed(2)}) is an anomaly (>${this.config.anomalyMultiplier}x the historical average of $${trailingAverageUsd.toFixed(2)}).`,
      };
    }

    // 5. Otherwise approve
    return {
      decision: "APPROVE",
      reason: "Transaction complies with all policies.",
    };
  }
}
