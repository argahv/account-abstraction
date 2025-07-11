const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Load addresses
  const deployments = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments.json"))
  );
  const managerAddress = deployments.CashOutManager;
  const amount = ethers.utils.parseEther("200"); // Example amount

  const [beneficiary] = await ethers.getSigners();
  const manager = await ethers.getContractAt("CashOutManager", managerAddress);
  const rahatToken = await ethers.getContractAt(
    "RahatToken",
    deployments.RahatToken
  );

  // Approve tokens for manager
  const approveTx = await rahatToken
    .connect(beneficiary)
    .approve(managerAddress, amount);
  await approveTx.wait();
  console.log(
    `Approved ${ethers.utils.formatEther(
      amount
    )} RahatToken for CashOutManager: ${managerAddress}`
  );

  // Cash out
  const cashoutTx = await manager.connect(beneficiary).cashOut(amount);
  await cashoutTx.wait();
  console.log(
    `Cashed out ${ethers.utils.formatEther(amount)} RahatToken for CashToken`
  );

  // Save info
  const info = {
    beneficiary: beneficiary.address,
    amount: amount.toString(),
    approveTxHash: approveTx.hash,
    cashoutTxHash: cashoutTx.hash,
  };
  fs.writeFileSync(
    path.join(__dirname, "..", "cashout.json"),
    JSON.stringify(info, null, 2)
  );
  console.log("Cashout info saved to cashout.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
