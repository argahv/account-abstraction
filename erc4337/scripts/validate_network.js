const { ethers } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function validateNetwork() {
  console.log("🔍 Network Validation");
  console.log("====================");

  try {
    // Check network connection
    const network = await ethers.provider.getNetwork();
    console.log(
      `📡 Connected to: ${network.name} (Chain ID: ${network.chainId})`
    );

    // Network type detection
    const isLocal = network.chainId === 31337;
    const isBaseSepolia = network.chainId === 84532;
    const isBaseMainnet = network.chainId === 8453;

    if (!isLocal && !isBaseSepolia && !isBaseMainnet) {
      console.warn(`⚠️  Unknown network: Chain ID ${network.chainId}`);
    }

    // Check deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer Address: ${deployer.address}`);

    // Check balance
    const balance = await deployer.getBalance();
    const balanceETH = ethers.utils.formatEther(balance);
    console.log(`💰 Current Balance: ${balanceETH} ETH`);

    // Minimum balance requirements
    const requirements = {
      local: { min: "1.0", recommended: "2.0" },
      baseSepolia: { min: "0.1", recommended: "0.2" },
      baseMainnet: { min: "5.0", recommended: "10.0" },
    };

    const currentReq = isLocal
      ? requirements.local
      : isBaseSepolia
      ? requirements.baseSepolia
      : requirements.baseMainnet;

    const minBalance = ethers.utils.parseEther(currentReq.min);
    const recommendedBalance = ethers.utils.parseEther(currentReq.recommended);

    // Balance validation
    if (balance.lt(minBalance)) {
      console.error(`❌ Insufficient Balance`);
      console.log(`   Required: ${currentReq.min} ETH`);
      console.log(`   Current: ${balanceETH} ETH`);

      if (isBaseSepolia) {
        console.log(`💡 Get testnet ETH:`);
        console.log(`   • https://www.alchemy.com/faucets/base-sepolia`);
        console.log(`   • https://bridge.base.org/deposit`);
      }
      return false;
    } else if (balance.lt(recommendedBalance)) {
      console.warn(`⚠️  Low Balance - consider getting more`);
      console.log(`   Recommended: ${currentReq.recommended} ETH`);
      console.log(`   Current: ${balanceETH} ETH`);
    } else {
      console.log(`✅ Sufficient Balance`);
    }

    // Environment validation
    console.log("\n🔧 Environment Check");
    console.log("====================");

    // Check for .env file
    if (fs.existsSync(".env")) {
      console.log("✅ .env file found");

      // Check required environment variables
      const requiredVars = ["DEPLOYER_PRIVATE_KEY"];
      const optionalVars = ["BASE_SEPOLIA_RPC_URL", "BASESCAN_API_KEY"];

      let envValid = true;
      for (const envVar of requiredVars) {
        if (process.env[envVar]) {
          console.log(`✅ ${envVar} configured`);
        } else {
          console.error(`❌ Missing ${envVar} in .env`);
          envValid = false;
        }
      }

      for (const envVar of optionalVars) {
        if (process.env[envVar]) {
          console.log(`✅ ${envVar} configured`);
        } else {
          console.log(`⚪ ${envVar} not set (optional)`);
        }
      }

      if (!envValid) {
        console.log("\n💡 Create .env file with:");
        console.log("DEPLOYER_PRIVATE_KEY=your_private_key_here");
        return false;
      }
    } else {
      console.error("❌ .env file not found");
      console.log("💡 Create .env file with your configuration");
      return false;
    }

    // Gas price check (for non-local networks)
    if (!isLocal) {
      console.log("\n⛽ Gas Price Check");
      console.log("==================");

      try {
        const gasPrice = await ethers.provider.getGasPrice();
        const gasPriceGwei = ethers.utils.formatUnits(gasPrice, "gwei");
        console.log(`📊 Current Gas Price: ${gasPriceGwei} gwei`);

        const maxGwei = isBaseSepolia ? 10 : 50;
        if (parseFloat(gasPriceGwei) > maxGwei) {
          console.warn(`⚠️  High gas prices detected (>${maxGwei} gwei)`);
          console.log("💡 Consider deploying during lower congestion");
        } else {
          console.log("✅ Gas prices look reasonable");
        }
      } catch (error) {
        console.warn(`⚠️  Could not fetch gas price: ${error.message}`);
      }
    }

    // Block height check
    console.log("\n🔗 Network Status");
    console.log("=================");

    try {
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const timeSinceLastBlock = Date.now() - block.timestamp * 1000;

      console.log(`📦 Latest Block: ${blockNumber}`);
      console.log(
        `⏰ Block Age: ${Math.round(timeSinceLastBlock / 1000)}s ago`
      );

      if (timeSinceLastBlock > 60000) {
        // > 1 minute
        console.warn(`⚠️  Last block is old - network may be slow`);
      } else {
        console.log("✅ Network is active");
      }
    } catch (error) {
      console.error(`❌ Could not fetch block info: ${error.message}`);
      return false;
    }

    // Final validation summary
    console.log("\n🎯 Validation Summary");
    console.log("====================");
    console.log("✅ Network connection working");
    console.log("✅ Deployer account configured");
    console.log("✅ Sufficient balance available");
    console.log("✅ Environment variables set");
    console.log("✅ Network is responsive");

    console.log(`\n🚀 Ready to deploy on ${network.name}!`);
    console.log("\nNext steps:");
    console.log("1. npx hardhat run deploy/deploy_core.js --network <network>");
    console.log("2. npx hardhat run deploy/deploy_app.js --network <network>");
    console.log(
      "3. npx hardhat run complete_demo_flow_with_paymaster.js --network <network>"
    );

    return true;
  } catch (error) {
    console.error(`❌ Validation failed: ${error.message}`);

    if (error.code === "NETWORK_ERROR") {
      console.log("💡 Check your internet connection and RPC URL");
    } else if (error.code === "INVALID_ARGUMENT") {
      console.log("💡 Check your private key format in .env");
    }

    return false;
  }
}

async function main() {
  const isValid = await validateNetwork();
  process.exit(isValid ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
