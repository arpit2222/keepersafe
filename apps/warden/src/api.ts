import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

import { KeeperHubClient } from './keeperhub-client';
import { PolicyEngine, PolicyConfig } from './policy';
import { AuditLog } from './models/AuditLog';

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const app = express();
app.use(cors());
app.use(express.json());

// Health check route for Render/Deployment verification
app.get('/', (req, res) => {
  res.json({ 
    status: "online", 
    service: "Warden Guarded Execution Gateway API",
    docs: "See README for API usage."
  });
});

const keeperHub = new KeeperHubClient();

// Default config for demo
const policyConfig: PolicyConfig = {
  perTransactionCapUsd: 1000,
  dailyCapUsd: 5000,
  allowedCounterparties: [
    "0x000000000000000000000000000000000000dead",
    "0x9f86b320e94bf553ee17aaa4e86217ea5bde7c6e"
  ],
  anomalyMultiplier: 5,
};

const policyEngine = new PolicyEngine(policyConfig);

// Helper to get trailing average (mock logic for demo)
async function getTrailingAverageUsd(): Promise<number> {
  const recentLogs = await (AuditLog as any).find({ status: "EXECUTED" }).sort({ timestamp: -1 }).limit(10);
  if (recentLogs.length === 0) return 100; // Mock base $100 if no history
  
  const sum = recentLogs.reduce((acc, log) => {
    const wei = BigInt(log.action.amount || "0");
    const usd = (Number(wei) / 1e18) * 3000;
    return acc + usd;
  }, 0);
  return sum / recentLogs.length;
}

app.post('/api/warden/request', async (req, res) => {
  try {
    const { action, requestedBy, statedIntent } = req.body;

    if (!action || !action.to_address || !action.amount) {
      return res.status(400).json({ error: "Missing required action fields (to_address, amount)" });
    }

    const idempotencyKey = crypto.randomUUID();
    
    // 1. Simulate
    let simEffect;
    try {
      simEffect = await keeperHub.simulateTransfer(action.to_address, action.amount, action.token_address);
    } catch (simError: any) {
      // Log as rejected if simulation fails (e.g. insufficient funds)
      const log = new (AuditLog as any)({
        idempotencyKey,
        action,
        requestedBy,
        statedIntent,
        simulatedEffect: { error: simError.message },
        decision: "REJECT",
        reason: "Simulation failed (e.g. insufficient balance)",
        status: "REJECTED"
      });
      await log.save();
      return res.json({ success: true, decision: "REJECT", status: "REJECTED", reason: "Simulation failed", log });
    }
    const spendingLimits = await keeperHub.getSpendingLimits();
    const trailingAverageUsd = await getTrailingAverageUsd();

    // 2. Evaluate Policy
    const policyResult = policyEngine.evaluate(simEffect, spendingLimits, trailingAverageUsd);

    let status = "PENDING";
    let executionId = undefined;
    let txHash = undefined;

    // 3. Act on decision
    if (policyResult.decision === "APPROVE") {
      try {
        const execResult = await keeperHub.executeTransfer(
          action.to_address, 
          action.amount, 
          action.token_address,
          idempotencyKey
        );
        executionId = execResult.executionId || execResult.execution_id || execResult.id;
        
        // Wait briefly for status to pick up txHash if possible (optional, but good for demo)
        if (executionId) {
          const statusRes = await keeperHub.getExecutionStatus(executionId);
          txHash = statusRes.transactionHash || statusRes.transaction_hash;
        }
        status = "EXECUTED";
      } catch (err: any) {
        policyResult.decision = "REJECT";
        policyResult.reason = `Execution failed: ${err.message}`;
        status = "FAILED";
      }
    } else if (policyResult.decision === "HOLD") {
      status = "HELD";
    } else {
      status = "REJECTED";
    }

    // 4. Write Audit Log
    const log = new AuditLog({
      requestedBy,
      action,
      simulatedEffect: simEffect,
      decision: policyResult.decision,
      reason: policyResult.reason,
      executionId,
      txHash,
      status,
      idempotencyKey
    });
    
    await log.save();

    res.json({
      decision: policyResult.decision,
      reason: policyResult.reason,
      status,
      txHash,
      logId: log._id
    });
  } catch (error: any) {
    console.error("Error in /api/warden/request:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/warden/audit', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
      
    const total = await AuditLog.countDocuments();
    
    res.json({
      data: logs,
      total,
      page,
      limit
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/warden/held/:id/approve', async (req, res) => {
  try {
    const log = await (AuditLog as any).findById(req.params.id);
    if (!log || log.status !== "HELD") {
      return res.status(404).json({ error: "Held log not found or already processed" });
    }

    const execResult = await keeperHub.executeTransfer(
      log.action.to_address, 
      log.action.amount, 
      log.action.token_address,
      log.idempotencyKey
    );
    
    const executionId = execResult.executionId || execResult.execution_id || execResult.id;
    let txHash = undefined;
    
    if (executionId) {
      const statusRes = await keeperHub.getExecutionStatus(executionId);
      txHash = statusRes.transactionHash || statusRes.transaction_hash;
    }

    log.status = "EXECUTED";
    log.executionId = executionId;
    log.txHash = txHash;
    log.decision = "APPROVE";
    log.reason = "Manually approved by human operator.";
    await log.save();

    res.json({ success: true, executionId, txHash, log });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/warden/held/:id/reject', async (req, res) => {
  try {
    const log = await (AuditLog as any).findById(req.params.id);
    if (!log || log.status !== "HELD") {
      return res.status(404).json({ error: "Held log not found or already processed" });
    }

    log.status = "REJECTED";
    log.decision = "REJECT";
    log.reason = "Manually rejected by human operator.";
    await log.save();

    res.json({ success: true, log });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
