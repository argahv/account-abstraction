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

  // Load field office's EOA private key (assuming same as deployer for demo)
  const fieldOfficeEoa = new ethers.Wallet(
    process.env.DEPLOYER_PRIVATE_KEY,
    provider
  );

  // Create SimpleAccountAPI for field office
  const fieldOfficeAccountApi = createAccountAPI(
    provider,
    core.EntryPoint,
    core.SimpleAccountFactory,
    fieldOfficeEoa
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

  console.log("Starting assign via Account Abstraction...");
  console.log("Field Office SimpleAccount:", accounts.fieldOffice.smartAccount);
  console.log("Beneficiary SimpleAccount:", accounts.beneficiary.smartAccount);

  // Assign tokens from field office to beneficiary
  const assignAmount = ethers.utils.parseEther("200");
  const assignData = encodeFunctionCall(rahatToken, "transfer", [
    accounts.beneficiary.smartAccount,
    assignAmount,
  ]);

  const assignUserOp = await createSignedUserOp(
    fieldOfficeAccountApi,
    deployments.CashOutManager,
    assignData
  );
  console.log("Sending assign UserOperation...");
  const assignTxHash = await sendUserOp(fieldOfficeAccountApi, assignUserOp);
  console.log("Assign UserOperation sent, hash:", assignTxHash);

  // Save transaction info
  const txInfo = {
    fieldOffice: accounts.fieldOffice,
    beneficiary: accounts.beneficiary,
    assignAmount: assignAmount.toString(),
    approveUserOpHash: approveTxHash,
    assignUserOpHash: assignTxHash,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(__dirname, "../assign_aa.json"),
    JSON.stringify(txInfo, null, 2)
  );
  console.log("Transaction info saved to assign_aa.json");
  console.log("Assignment completed via Account Abstraction!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
