const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  // Set your paymaster and entrypoint addresses
  const paymasterAddress = "0x454c35943Fcae628A3fb8D18e93632a81810DA92";

  // You may need to update this if your EntryPoint address is different
  // If you have it in deployments, load it from there
  const deployments = require("../deployment/core_deployments.json");
  const entryPointAddress = deployments.EntryPoint;

  // Amount to deposit (edit as needed)
  const depositAmount = ethers.utils.parseEther("0.2");

  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Attach to EntryPoint
  const EntryPoint = await ethers.getContractFactory("EntryPoint");
  const entryPoint = EntryPoint.attach(entryPointAddress);

  // Deposit ETH for the paymaster
  console.log(
    `Depositing ${ethers.utils.formatEther(
      depositAmount
    )} ETH to paymaster in EntryPoint...`
  );
  const tx = await entryPoint.depositTo(paymasterAddress, {
    value: depositAmount,
  });
  await tx.wait();
  console.log(`✅ Deposit complete!`);

  // Check deposit
  const deposit = await entryPoint.balanceOf(paymasterAddress);
  console.log(
    `Paymaster deposit in EntryPoint: ${ethers.utils.formatEther(deposit)} ETH`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
