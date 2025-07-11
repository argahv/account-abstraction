const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Load core deployments
  const core = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../core_deployments.json"))
  );

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
    RahatToken: rahatToken.address,
    CashToken: cashToken.address,
    CashOutManager: manager.address,
  };
  fs.writeFileSync(
    path.join(__dirname, "../deployments.json"),
    JSON.stringify(deployments, null, 2)
  );
  console.log("App contract addresses saved to deployments.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
