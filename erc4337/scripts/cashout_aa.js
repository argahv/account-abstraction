const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const {
  createAccountAPI,
  createSignedUserOp,
  sendUserOp,
  encodeFunctionCall,
} = require("../sdk/userop_helpers");

async function main() {
  // Load deployment info
  const core = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../core_deployments.json"))
  );
  const deployments = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../deployments.json"))
  );
  const accounts = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../accounts.json"))
  );

  // Set up provider
  const provider = new ethers.providers.JsonRpcProvider(
    "https://sepolia.base.org"
  );

  // Load beneficiary's EOA private key (assuming same as deployer for demo)
  const beneficiaryEoa = new ethers.Wallet(
    process.env.DEPLOYER_PRIVATE_KEY,
    provider
  );

  // Create SimpleAccountAPI for beneficiary
  const beneficiaryAccountApi = createAccountAPI(
    provider,
    core.EntryPoint,
    core.SimpleAccountFactory,
    beneficiaryEoa
  );

  // Get contract instances
  const rahatToken = await ethers.getContractAt(
    "RahatToken",
    deployments.RahatToken
  );
  const manager = await ethers.getContractAt(
    "CashOutManager",
    deployments.CashOutManager
  );

  console.log("Starting cashout via Account Abstraction...");
  console.log("Beneficiary SimpleAccount:", accounts.beneficiary.smartAccount);

  // Cash out tokens
  const cashoutAmount = ethers.utils.parseEther("100");

  // Step 1: Approve tokens for CashOutManager
  const approveData = encodeFunctionCall(rahatToken, "approve", [
    deployments.CashOutManager,
    cashoutAmount,
  ]);

  const approveUserOp = await createSignedUserOp(
    beneficiaryAccountApi,
    deployments.RahatToken,
    approveData
  );
  console.log("Sending approve UserOperation...");
  const approveTxHash = await sendUserOp(beneficiaryAccountApi, approveUserOp);
  console.log("Approve UserOperation sent, hash:", approveTxHash);

  // Wait a bit for the approval to be processed
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Step 2: Cash out tokens
  const cashoutData = encodeFunctionCall(manager, "cashOut", [cashoutAmount]);

  const cashoutUserOp = await createSignedUserOp(
    beneficiaryAccountApi,
    deployments.CashOutManager,
    cashoutData
  );
  console.log("Sending cashout UserOperation...");
  const cashoutTxHash = await sendUserOp(beneficiaryAccountApi, cashoutUserOp);
  console.log("Cashout UserOperation sent, hash:", cashoutTxHash);

  // Save transaction info
  const txInfo = {
    beneficiary: accounts.beneficiary,
    cashoutAmount: cashoutAmount.toString(),
    approveUserOpHash: approveTxHash,
    cashoutUserOpHash: cashoutTxHash,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(__dirname, "../cashout_aa.json"),
    JSON.stringify(txInfo, null, 2)
  );
  console.log("Transaction info saved to cashout_aa.json");
  console.log("Cashout completed via Account Abstraction!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
