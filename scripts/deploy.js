const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy RahatToken
  const RahatToken = await ethers.getContractFactory("RahatToken");
  const rahatToken = await RahatToken.deploy();
  await rahatToken.deployed();
  console.log("RahatToken deployed to:", rahatToken.address);

  // Deploy CashToken
  const CashToken = await ethers.getContractFactory("CashToken");
  const cashToken = await CashToken.deploy();
  await cashToken.deployed();
  console.log("CashToken deployed to:", cashToken.address);

  // Deploy CashOutManager
  const CashOutManager = await ethers.getContractFactory("CashOutManager");
  const manager = await CashOutManager.deploy(
    rahatToken.address,
    cashToken.address
  );
  await manager.deployed();
  console.log("CashOutManager deployed to:", manager.address);

  // Transfer ownership of CashToken to manager
  await cashToken.transferOwnership(manager.address);
  console.log("Ownership of CashToken transferred to CashOutManager");

  // Save addresses to deployments.json
  const deployments = {
    network: ethers.provider._network
      ? ethers.provider._network.name
      : "base_sepolia",
    deployer: deployer.address,
    RahatToken: rahatToken.address,
    CashToken: cashToken.address,
    CashOutManager: manager.address,
  };
  const filePath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(filePath, JSON.stringify(deployments, null, 2));
  console.log("Deployment info saved to deployments.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
