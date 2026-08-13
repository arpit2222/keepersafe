import { describe, it, expect, beforeEach } from "vitest";
import { PolicyEngine, PolicyConfig } from "../src/policy";

describe("PolicyEngine", () => {
  let engine: PolicyEngine;
  const config: PolicyConfig = {
    perTransactionCapUsd: 1000,
    dailyCapUsd: 5000,
    allowedCounterparties: ["0xAllowed123", "0xAllowed456"],
    anomalyMultiplier: 5,
  };

  beforeEach(() => {
    engine = new PolicyEngine(config);
  });

  it("should REJECT if KeeperHub simulation indicates revert", () => {
    const simEffect = {
      wouldRevert: true,
      revertReason: "Insufficient funds",
    };
    const result = engine.evaluate(simEffect, {}, 100);
    expect(result.decision).toBe("REJECT");
    expect(result.reason).toContain("revert");
  });

  it("should REJECT if counterparty is not on the allow-list", () => {
    const simEffect = {
      wouldRevert: false,
      to: "0xUnknownAddr",
      value: "0"
    };
    const result = engine.evaluate(simEffect, {}, 100);
    expect(result.decision).toBe("REJECT");
    expect(result.reason).toContain("not on the allow-list");
  });

  it("should REJECT if value exceeds per-transaction cap", () => {
    // 1 ETH = $3000 mock. So 0.5 ETH = $1500 > $1000 cap
    const simEffect = {
      wouldRevert: false,
      to: "0xAllowed123",
      value: "500000000000000000" // 0.5 ETH
    };
    const result = engine.evaluate(simEffect, {}, 100);
    expect(result.decision).toBe("REJECT");
    expect(result.reason).toContain("exceeds per-transaction cap");
  });

  it("should HOLD if value is an anomaly compared to trailing average", () => {
    // 0.2 ETH = $600. Cap is $1000, so it's under the hard cap.
    // Trailing average is $100. $600 > $100 * 5, so it's an anomaly.
    const simEffect = {
      wouldRevert: false,
      to: "0xAllowed123",
      value: "200000000000000000" // 0.2 ETH
    };
    const result = engine.evaluate(simEffect, {}, 100);
    expect(result.decision).toBe("HOLD");
    expect(result.reason).toContain("is an anomaly");
  });

  it("should APPROVE if all policies pass", () => {
    // 0.1 ETH = $300. Cap is $1000.
    // Trailing average is $100. $300 < $100 * 5. Passes.
    const simEffect = {
      wouldRevert: false,
      to: "0xAllowed123",
      value: "100000000000000000" // 0.1 ETH
    };
    const result = engine.evaluate(simEffect, {}, 100);
    expect(result.decision).toBe("APPROVE");
    expect(result.reason).toBe("Transaction complies with all policies.");
  });
});
