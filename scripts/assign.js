const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Load addresses
  const deployments = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments.json"))
  );
  const managerAddress = deployments.CashOutManager;
  const beneficiaryAddress = "0xaB85619CC71D089C28Ce7b802f4d9CD584D43CE7"; // Set this before running
  const amount = ethers.utils.parseEther("200"); // Example amount

  const [fieldOffice] = await ethers.getSigners();
  const manager = await ethers.getContractAt("CashOutManager", managerAddress);
  const rahatToken = await ethers.getContractAt(
    "RahatToken",
    deployments.RahatToken
  );

  // Approve tokens for manager
  const approveTx = await rahatToken
    .connect(fieldOffice)
    .approve(managerAddress, amount);
  await approveTx.wait();
  console.log(
    `Approved ${ethers.utils.formatEther(
      amount
    )} RahatToken for CashOutManager: ${managerAddress}`
  );

  // Assign tokens to beneficiary
  const assignTx = await manager
    .connect(fieldOffice)
    .assignToBeneficiary(beneficiaryAddress, amount);
  await assignTx.wait();
  console.log(
    `Assigned ${ethers.utils.formatEther(
      amount
    )} RahatToken to beneficiary: ${beneficiaryAddress}`
  );

  // Save info
  const info = {
    fieldOffice: fieldOffice.address,
    beneficiary: beneficiaryAddress,
    amount: amount.toString(),
    approveTxHash: approveTx.hash,
    assignTxHash: assignTx.hash,
  };
  fs.writeFileSync(
    path.join(__dirname, "..", "assign.json"),
    JSON.stringify(info, null, 2)
  );
  console.log("Assignment info saved to assign.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
