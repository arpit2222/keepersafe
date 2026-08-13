import { KeeperHubClient } from "../src/keeperhub-client";
import crypto from "crypto";

async function main() {
  const client = new KeeperHubClient();
  const testAddress = "0x000000000000000000000000000000000000dEaD";
  const amount = "0.0001"; // Tiny amount of Sepolia ETH

  console.log(`Starting Phase 1: Prove Execution`);
  console.log(`Simulating transfer of ${amount} ETH to ${testAddress}...`);

  try {
    const simResult = await client.simulateTransfer(testAddress, amount);
    console.log("Simulation Result:");
    console.log(JSON.stringify(simResult, null, 2));

    if (simResult.wouldRevert !== false) {
      console.warn("Simulation indicates the transaction might revert. Proceeding anyway for the demo...");
    }

    const idempotencyKey = crypto.randomUUID();
    console.log(`\nExecuting transfer for real (Idempotency Key: ${idempotencyKey})...`);

    const execResult = await client.executeTransfer(testAddress, amount, undefined, idempotencyKey);
    console.log("Execution Response:");
    console.log(JSON.stringify(execResult, null, 2));

    const executionId = execResult.executionId || execResult.execution_id || execResult.id;
    if (!executionId) {
      throw new Error("Could not find execution ID in the response.");
    }

    console.log(`\nPolling status for Execution ID: ${executionId}...`);

    let txHash: string | null = null;
    while (true) {
      const statusRes = await client.getExecutionStatus(executionId);
      console.log(`Status: ${statusRes.status}`);
      
      if (statusRes.transactionHash || statusRes.transaction_hash) {
        txHash = statusRes.transactionHash || statusRes.transaction_hash;
        console.log(`Transaction Hash: ${txHash}`);
      }

      if (statusRes.status === "completed" || statusRes.status === "failed") {
        console.log(`\nFinal Status: ${statusRes.status}`);
        if (txHash) {
          console.log(`View on Block Explorer: https://sepolia.etherscan.io/tx/${txHash}`);
        }
        break;
      }
      
      // Wait 3 seconds before polling again
      await new Promise(r => setTimeout(r, 3000));
    }
  } catch (error) {
    console.error("Error during execution:", error);
  }
}

main().catch(console.error);
