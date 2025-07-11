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

  // Load donor's EOA private key
  const donorEoa = new ethers.Wallet(
    process.env.DEPLOYER_PRIVATE_KEY,
    provider
  );

  // Create SimpleAccountAPI for donor
  const donorAccountApi = createAccountAPI(
    provider,
    core.EntryPoint,
    core.SimpleAccountFactory,
    donorEoa
  );

  // Get contract instances
  const rahatToken = await ethers.getContractAt(
    "RahatToken",
    deployments.RahatToken
  );

  console.log("Starting mint and transfer via Account Abstraction...");
  console.log("Donor SimpleAccount:", accounts.donor.smartAccount);
  console.log("Field Office SimpleAccount:", accounts.fieldOffice.smartAccount);

  // Step 1: Mint tokens to donor's SimpleAccount
  const mintAmount = ethers.utils.parseEther("1000");
  const mintData = encodeFunctionCall(rahatToken, "mint", [
    accounts.donor.smartAccount,
    mintAmount,
  ]);

  const mintUserOp = await createSignedUserOp(
    donorAccountApi,
    deployments.RahatToken,
    mintData
  );
  console.log("Sending mint UserOperation...");
  const mintTxHash = await sendUserOp(donorAccountApi, mintUserOp);
  console.log("Mint UserOperation sent, hash:", mintTxHash);

  // Wait a bit for the mint to be processed
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Step 2: Transfer tokens to field office's SimpleAccount
  const transferAmount = ethers.utils.parseEther("500");
  const transferData = encodeFunctionCall(rahatToken, "transfer", [
    accounts.fieldOffice.smartAccount,
    transferAmount,
  ]);

  const transferUserOp = await createSignedUserOp(
    donorAccountApi,
    deployments.RahatToken,
    transferData
  );
  console.log("Sending transfer UserOperation...");
  const transferTxHash = await sendUserOp(donorAccountApi, transferUserOp);
  console.log("Transfer UserOperation sent, hash:", transferTxHash);

  // Save transaction info
  const txInfo = {
    donor: accounts.donor,
    fieldOffice: accounts.fieldOffice,
    mintAmount: mintAmount.toString(),
    transferAmount: transferAmount.toString(),
    mintUserOpHash: mintTxHash,
    transferUserOpHash: transferTxHash,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(__dirname, "../mint_and_transfer_aa.json"),
    JSON.stringify(txInfo, null, 2)
  );
  console.log("Transaction info saved to mint_and_transfer_aa.json");
  console.log("Mint and transfer completed via Account Abstraction!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
