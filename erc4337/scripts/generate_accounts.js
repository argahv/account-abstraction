const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🔑 Generating Real Accounts for Base Sepolia");
  console.log("==========================================\n");

  // Check if we have private keys in .env
  const envKeys = {
    donor: process.env.DONOR_PRIVATE_KEY,
    fieldOffice: process.env.FIELD_OFFICE_PRIVATE_KEY,
    beneficiary: process.env.BENEFICIARY_PRIVATE_KEY,
  };

  const accounts = {};

  for (const [role, privateKey] of Object.entries(envKeys)) {
    if (privateKey) {
      // Use existing private key
      const wallet = new ethers.Wallet(privateKey);
      accounts[role] = {
        eoa: wallet.address,
        privateKey: privateKey,
        source: "environment",
      };
      console.log(
        `✅ ${role} account loaded from environment: ${wallet.address}`
      );
    } else {
      // Generate new account
      const wallet = ethers.Wallet.createRandom();
      accounts[role] = {
        eoa: wallet.address,
        privateKey: wallet.privateKey,
        source: "generated",
      };
      console.log(`🆕 ${role} account generated: ${wallet.address}`);
      console.log(`   Private key: ${wallet.privateKey}`);
    }
  }

  // Connect to Base Sepolia
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"
  );

  console.log("\n💰 Checking account balances...");

  let totalBalance = ethers.BigNumber.from(0);
  for (const [role, account] of Object.entries(accounts)) {
    try {
      const balance = await provider.getBalance(account.eoa);
      const balanceETH = ethers.utils.formatEther(balance);
      console.log(`${role}: ${balanceETH} ETH`);
      totalBalance = totalBalance.add(balance);
    } catch (error) {
      console.log(`${role}: Unable to check balance (${error.message})`);
    }
  }

  const totalETH = ethers.utils.formatEther(totalBalance);
  console.log(`\nTotal balance: ${totalETH} ETH`);

  if (totalBalance.lt(ethers.utils.parseEther("0.01"))) {
    console.log("\n⚠️  Warning: Low balance detected!");
    console.log("Fund your accounts with Base Sepolia ETH from:");
    console.log(
      "- Base Sepolia Faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet"
    );
    console.log("- Alchemy Faucet: https://sepoliafaucet.com/");
    console.log("\nRecommended amounts:");
    console.log("- Donor: 0.01 ETH (for gas fees)");
    console.log("- Field Office: 0.005 ETH (for gas fees)");
    console.log("- Beneficiary: 0.005 ETH (for gas fees)");
  }

  // Save account info (without private keys for security)
  const accountsForSave = {};
  for (const [role, account] of Object.entries(accounts)) {
    accountsForSave[role] = {
      eoa: account.eoa,
      smartAccount: "0x0000000000000000000000000000000000000000", // Will be updated after deployment
    };
  }

  fs.writeFileSync(
    path.join(__dirname, "..", "base_sepolia_accounts.json"),
    JSON.stringify(accountsForSave, null, 2)
  );
  console.log("\n💾 Account addresses saved to base_sepolia_accounts.json");

  // Generate .env template with new accounts
  const envTemplate = `# Base Sepolia Configuration
DEPLOYER_PRIVATE_KEY=${accounts.donor.privateKey}
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
CHAIN_ID=84532

# Account Private Keys
DONOR_PRIVATE_KEY=${accounts.donor.privateKey}
FIELD_OFFICE_PRIVATE_KEY=${accounts.fieldOffice.privateKey}
BENEFICIARY_PRIVATE_KEY=${accounts.beneficiary.privateKey}

# Optional: Custom RPC URL
# BASE_SEPOLIA_RPC_URL=https://base-sepolia.infura.io/v3/your-project-id
`;

  fs.writeFileSync(path.join(__dirname, "..", "base_sepolia.env"), envTemplate);
  console.log("📝 Environment template saved to base_sepolia.env");

  console.log("\n🔐 SECURITY NOTICE:");
  console.log("==================");
  console.log("1. Keep your private keys secure and never share them");
  console.log("2. These are test accounts - don't use for mainnet");
  console.log("3. Fund accounts with small amounts only");
  console.log("4. Copy base_sepolia.env to .env to use these accounts");

  console.log("\n📋 Next Steps:");
  console.log("==============");
  console.log("1. Fund the accounts with Base Sepolia ETH");
  console.log("2. Copy base_sepolia.env to .env");
  console.log("3. Run: node scripts/validate_network.js");
  console.log(
    "4. Run: npx hardhat run deploy_to_base_sepolia.js --network base_sepolia"
  );
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
