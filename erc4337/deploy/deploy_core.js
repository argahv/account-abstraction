const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Deploy EntryPoint
  const EntryPoint = await ethers.getContractFactory("EntryPoint");
  const entryPoint = await EntryPoint.deploy();
  await entryPoint.deployed();
  console.log("EntryPoint deployed to:", entryPoint.address);

  // Deploy SimpleAccountFactory
  const SimpleAccountFactory = await ethers.getContractFactory(
    "SimpleAccountFactory"
  );
  const factory = await SimpleAccountFactory.deploy(entryPoint.address);
  await factory.deployed();
  console.log("SimpleAccountFactory deployed to:", factory.address);

  // (Optional) Deploy Paymaster
  // const Paymaster = await ethers.getContractFactory("YourPaymaster");
  // const paymaster = await Paymaster.deploy(entryPoint.address);
  // await paymaster.deployed();
  // console.log("Paymaster deployed to:", paymaster.address);

  // Save addresses
  const coreDeployments = {
    EntryPoint: entryPoint.address,
    SimpleAccountFactory: factory.address,
    // Paymaster: paymaster.address
  };
  fs.writeFileSync(
    path.join(__dirname, "../core_deployments.json"),
    JSON.stringify(coreDeployments, null, 2)
  );
  console.log("Core contract addresses saved to core_deployments.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
