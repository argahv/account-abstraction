const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  // Deploy EntryPoint
  const EntryPoint = await ethers.getContractFactory("EntryPoint");
  const entryPoint = await EntryPoint.connect(deployer).deploy();
  await entryPoint.deployed();
  console.log("EntryPoint deployed to:", entryPoint.address);

  // Deploy tokens
  const RahatToken = await ethers.getContractFactory("RahatToken");
  const rahatToken = await RahatToken.connect(deployer).deploy();
  await rahatToken.deployed();
  console.log("RahatToken deployed to:", rahatToken.address);

  const CashToken = await ethers.getContractFactory("CashToken");
  const cashToken = await CashToken.connect(deployer).deploy();
  await cashToken.deployed();
  console.log("CashToken deployed to:", cashToken.address);

  // Deploy paymaster
  const SimpleVerifyingPaymaster = await ethers.getContractFactory(
    "SimpleVerifyingPaymaster"
  );
  const paymaster = await SimpleVerifyingPaymaster.connect(deployer).deploy();
  await paymaster.deployed();
  console.log("Paymaster deployed to:", paymaster.address);

  // Deploy factory
  const SimpleAdvancedAccountFactory = await ethers.getContractFactory(
    "SimpleAdvancedAccountFactory"
  );
  const factory = await SimpleAdvancedAccountFactory.connect(deployer).deploy(
    entryPoint.address,
    rahatToken.address,
    cashToken.address
  );
  await factory.deployed();
  console.log("Factory deployed to:", factory.address);

  // Save deployment addresses
  const deployment = {
    entryPoint: entryPoint.address,
    rahatToken: rahatToken.address,
    cashToken: cashToken.address,
    paymaster: paymaster.address,
    factory: factory.address,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync("deployment.json", JSON.stringify(deployment, null, 2));
  console.log("Deployment addresses saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
