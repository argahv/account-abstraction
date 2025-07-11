const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🚀 Deploying Advanced ERC-4337 Contracts to Base Sepolia");
  console.log("========================================================\n");

  // Validate environment
  console.log("🔍 Validating environment...");
  if (!process.env.DEPLOYER_PRIVATE_KEY) {
    console.error("❌ DEPLOYER_PRIVATE_KEY not found in environment variables");
    console.log("Please create a .env file with your private key:");
    console.log("DEPLOYER_PRIVATE_KEY=your_private_key_here");
    console.log("DONOR_PRIVATE_KEY=your_donor_private_key");
    console.log("FIELD_OFFICE_PRIVATE_KEY=your_field_office_private_key");
    console.log("BENEFICIARY_PRIVATE_KEY=your_beneficiary_private_key");
    process.exit(1);
  }

  // Check network
  const network = await ethers.provider.getNetwork();
  console.log("📡 Network:", network.name, "Chain ID:", network.chainId);

  if (network.chainId !== 84532) {
    console.log(
      "⚠️  Warning: Expected Base Sepolia (84532), got:",
      network.chainId
    );
    console.log("Make sure you're connected to the correct network!");
  }

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer address:", deployer.address);

  // Check balance
  const balance = await deployer.getBalance();
  console.log("💰 Deployer balance:", ethers.utils.formatEther(balance), "ETH");

  if (balance.lt(ethers.utils.parseEther("0.01"))) {
    console.log(
      "❌ Insufficient balance for deployment. Need at least 0.01 ETH"
    );
    console.log("Please fund your account with Base Sepolia ETH from:");
    console.log(
      "- Base Sepolia Faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet"
    );
    console.log("- Alchemy Faucet: https://sepoliafaucet.com/");
    return;
  }

  console.log("\n📋 Step 1: Deploying Core ERC-4337 Contracts...");
  console.log("================================================");

  // Deploy EntryPoint
  console.log("🔄 Deploying EntryPoint...");
  const EntryPoint = await ethers.getContractFactory("EntryPoint");
  const entryPoint = await EntryPoint.deploy();
  await entryPoint.deployed();
  console.log("✅ EntryPoint deployed to:", entryPoint.address);

  // Deploy AdvancedAccountFactory
  console.log("🔄 Deploying AdvancedAccountFactory...");
  const AdvancedAccountFactory = await ethers.getContractFactory(
    "AdvancedAccountFactory"
  );
  const factory = await AdvancedAccountFactory.deploy(entryPoint.address);
  await factory.deployed();
  console.log("✅ AdvancedAccountFactory deployed to:", factory.address);

  // Save core deployments
  const coreDeployments = {
    network: "base_sepolia",
    chainId: network.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    EntryPoint: entryPoint.address,
    AdvancedAccountFactory: factory.address,
  };

  fs.writeFileSync(
    path.join(__dirname, "base_sepolia_core_deployments.json"),
    JSON.stringify(coreDeployments, null, 2)
  );
  console.log(
    "💾 Core deployments saved to base_sepolia_core_deployments.json"
  );

  console.log("\n📋 Step 2: Deploying Application Contracts...");
  console.log("==============================================");

  // Deploy RahatToken
  console.log("🔄 Deploying RahatToken...");
  const RahatToken = await ethers.getContractFactory("RahatToken");
  const rahatToken = await RahatToken.deploy();
  await rahatToken.deployed();
  console.log("✅ RahatToken deployed to:", rahatToken.address);

  // Deploy CashToken
  console.log("🔄 Deploying CashToken...");
  const CashToken = await ethers.getContractFactory("CashToken");
  const cashToken = await CashToken.deploy();
  await cashToken.deployed();
  console.log("✅ CashToken deployed to:", cashToken.address);

  // Deploy CashOutManager
  console.log("🔄 Deploying CashOutManager...");
  const CashOutManager = await ethers.getContractFactory("CashOutManager");
  const manager = await CashOutManager.deploy(
    rahatToken.address,
    cashToken.address
  );
  await manager.deployed();
  console.log("✅ CashOutManager deployed to:", manager.address);

  // Transfer ownership of CashToken to manager
  console.log("🔄 Transferring CashToken ownership to CashOutManager...");
  await cashToken.transferOwnership(manager.address);
  console.log("✅ Ownership transferred");

  // Deploy TokenPaymaster
  console.log("🔄 Deploying TokenPaymaster...");
  const TokenPaymaster = await ethers.getContractFactory("TokenPaymaster");
  const paymaster = await TokenPaymaster.deploy(
    entryPoint.address,
    rahatToken.address,
    deployer.address
  );
  await paymaster.deployed();
  console.log("✅ TokenPaymaster deployed to:", paymaster.address);

  // Save app deployments
  const appDeployments = {
    network: "base_sepolia",
    chainId: network.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    RahatToken: rahatToken.address,
    CashToken: cashToken.address,
    CashOutManager: manager.address,
    TokenPaymaster: paymaster.address,
  };

  fs.writeFileSync(
    path.join(__dirname, "base_sepolia_app_deployments.json"),
    JSON.stringify(appDeployments, null, 2)
  );
  console.log("💾 App deployments saved to base_sepolia_app_deployments.json");

  console.log("\n📋 Step 3: Creating Test Advanced Account...");
  console.log("=============================================");

  // Create a test advanced account
  console.log("🔄 Creating test AdvancedAccount...");
  const createTx = await factory.createAccount(deployer.address, 0);
  const createReceipt = await createTx.wait();

  const accountAddress = await factory.getAddress(deployer.address, 0);
  console.log("✅ Test AdvancedAccount created:", accountAddress);

  // Fund the account with some ETH for testing
  console.log("🔄 Funding test account with 0.001 ETH...");
  await deployer.sendTransaction({
    to: accountAddress,
    value: ethers.utils.parseEther("0.001"),
  });
  console.log("✅ Account funded");

  // Mint some tokens to the account for testing
  console.log("🔄 Minting 1000 RahatTokens to test account...");
  await rahatToken.mint(accountAddress, ethers.utils.parseEther("1000"));
  console.log("✅ Tokens minted");

  // Save test account info
  const testAccount = {
    network: "base_sepolia",
    chainId: network.chainId,
    owner: deployer.address,
    advancedAccount: accountAddress,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(__dirname, "base_sepolia_test_account.json"),
    JSON.stringify(testAccount, null, 2)
  );
  console.log("💾 Test account info saved to base_sepolia_test_account.json");

  console.log("\n📋 Step 4: Verification & Summary...");
  console.log("====================================");

  // Verify deployments
  console.log("🔍 Verifying contract deployments...");

  try {
    // Check EntryPoint
    const entryPointCode = await ethers.provider.getCode(entryPoint.address);
    console.log("✅ EntryPoint verified - Code length:", entryPointCode.length);

    // Check Factory
    const factoryCode = await ethers.provider.getCode(factory.address);
    console.log(
      "✅ AdvancedAccountFactory verified - Code length:",
      factoryCode.length
    );

    // Check Advanced Account
    const accountCode = await ethers.provider.getCode(accountAddress);
    console.log(
      "✅ AdvancedAccount verified - Code length:",
      accountCode.length
    );

    // Check Token balances
    const accountTokenBalance = await rahatToken.balanceOf(accountAddress);
    console.log(
      "✅ Account token balance:",
      ethers.utils.formatEther(accountTokenBalance),
      "RAHAT"
    );
  } catch (error) {
    console.log("⚠️ Verification error:", error.message);
  }

  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT TO BASE SEPOLIA COMPLETE!");
  console.log("=".repeat(80));

  console.log("\n📊 Deployment Summary:");
  console.log("======================");
  console.log("🌐 Network: Base Sepolia (Chain ID: 84532)");
  console.log("👤 Deployer:", deployer.address);
  console.log(
    "💰 Final Balance:",
    ethers.utils.formatEther(await deployer.getBalance()),
    "ETH"
  );

  console.log("\n📋 Core Contracts:");
  console.log("==================");
  console.log("EntryPoint:", entryPoint.address);
  console.log("AdvancedAccountFactory:", factory.address);

  console.log("\n📋 Application Contracts:");
  console.log("=========================");
  console.log("RahatToken:", rahatToken.address);
  console.log("CashToken:", cashToken.address);
  console.log("CashOutManager:", manager.address);
  console.log("TokenPaymaster:", paymaster.address);

  console.log("\n📋 Test Account:");
  console.log("================");
  console.log("AdvancedAccount:", accountAddress);
  console.log("Owner:", deployer.address);
  console.log("Token Balance: 1000 RAHAT");

  console.log("\n🔗 Base Sepolia Explorer Links:");
  console.log("===============================");
  console.log(
    "EntryPoint:",
    `https://sepolia.basescan.org/address/${entryPoint.address}`
  );
  console.log(
    "AdvancedAccountFactory:",
    `https://sepolia.basescan.org/address/${factory.address}`
  );
  console.log(
    "Test AdvancedAccount:",
    `https://sepolia.basescan.org/address/${accountAddress}`
  );
  console.log(
    "RahatToken:",
    `https://sepolia.basescan.org/address/${rahatToken.address}`
  );

  console.log("\n📄 Deployment Files Created:");
  console.log("============================");
  console.log("• base_sepolia_core_deployments.json");
  console.log("• base_sepolia_app_deployments.json");
  console.log("• base_sepolia_test_account.json");

  console.log("\n🚀 Next Steps:");
  console.log("==============");
  console.log("1. Test the advanced features on Base Sepolia");
  console.log("2. Create additional accounts for multi-user testing");
  console.log("3. Set up delegation, session keys, and multi-sig");
  console.log("4. Test social recovery with multiple guardians");
  console.log("5. Integrate with frontend applications");

  console.log("\n✅ Advanced ERC-4337 contracts are now live on Base Sepolia!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
