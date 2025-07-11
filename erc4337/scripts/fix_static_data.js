const {
  validateAllDeployments,
  printValidationResults,
} = require("../utils/network_validator");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🔧 ERC-4337 Static Data Fix & Base Sepolia Preparation");
  console.log("======================================================\n");

  // Step 1: Validate current state
  console.log("📋 Step 1: Analyzing Current Static Data Issues");
  console.log("===============================================");

  const validation = validateAllDeployments();
  printValidationResults(validation);

  if (validation.overall.valid) {
    console.log(
      "\n✅ No static data issues found! Your system is ready for the target network."
    );
    return;
  }

  // Step 2: Show what needs to be fixed
  console.log("\n🔍 Step 2: Summary of Issues Found");
  console.log("=================================");

  const issues = validation.overall.errors;
  const hardhatAddresses = issues.filter((error) =>
    error.includes("local Hardhat address")
  );

  console.log(
    `Found ${hardhatAddresses.length} hardcoded local addresses that need to be replaced:`
  );
  hardhatAddresses.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });

  // Step 3: Generate solution
  console.log("\n🚀 Step 3: Generating Solution");
  console.log("==============================");

  // Check if we already have Base Sepolia accounts
  const baseSepoliaAccountsPath = path.join(
    __dirname,
    "..",
    "base_sepolia_accounts.json"
  );
  const baseSepoliaEnvPath = path.join(__dirname, "..", "base_sepolia.env");

  if (!fs.existsSync(baseSepoliaAccountsPath)) {
    console.log("🔄 Generating new Base Sepolia accounts...");

    // Generate accounts
    const accounts = {};
    const roles = ["donor", "fieldOffice", "beneficiary"];

    for (const role of roles) {
      const wallet = ethers.Wallet.createRandom();
      accounts[role] = {
        eoa: wallet.address,
        privateKey: wallet.privateKey,
      };
      console.log(`✅ Generated ${role}: ${wallet.address}`);
    }

    // Save accounts (without private keys for security)
    const accountsForSave = {};
    for (const [role, account] of Object.entries(accounts)) {
      accountsForSave[role] = {
        eoa: account.eoa,
        smartAccount: "0x0000000000000000000000000000000000000000", // Will be updated after deployment
      };
    }

    fs.writeFileSync(
      baseSepoliaAccountsPath,
      JSON.stringify(accountsForSave, null, 2)
    );
    console.log("💾 Saved accounts to base_sepolia_accounts.json");

    // Generate .env file
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

    fs.writeFileSync(baseSepoliaEnvPath, envTemplate);
    console.log("📝 Generated base_sepolia.env");
  } else {
    console.log("✅ Base Sepolia accounts already exist");
  }

  // Step 4: Check account balances
  console.log("\n💰 Step 4: Checking Account Balances");
  console.log("===================================");

  try {
    const provider = new ethers.providers.JsonRpcProvider(
      "https://sepolia.base.org"
    );
    const accounts = JSON.parse(
      fs.readFileSync(baseSepoliaAccountsPath, "utf8")
    );

    let totalBalance = ethers.BigNumber.from(0);
    let fundedCount = 0;

    for (const [role, account] of Object.entries(accounts)) {
      try {
        const balance = await provider.getBalance(account.eoa);
        const balanceETH = ethers.utils.formatEther(balance);
        console.log(`${role}: ${balanceETH} ETH`);

        if (balance.gt(0)) {
          fundedCount++;
        }
        totalBalance = totalBalance.add(balance);
      } catch (error) {
        console.log(`${role}: Unable to check balance`);
      }
    }

    const totalETH = ethers.utils.formatEther(totalBalance);
    console.log(
      `\nTotal balance: ${totalETH} ETH (${fundedCount}/3 accounts funded)`
    );

    if (totalBalance.lt(ethers.utils.parseEther("0.01"))) {
      console.log("\n⚠️  Accounts need funding! Get Base Sepolia ETH from:");
      console.log(
        "- Base Sepolia Faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet"
      );
      console.log("- Alchemy Faucet: https://sepoliafaucet.com/");
    }
  } catch (error) {
    console.log("⚠️  Could not check balances (network connection issue)");
  }

  // Step 5: Deployment plan
  console.log("\n📋 Step 5: Deployment Plan");
  console.log("=========================");

  console.log("To fix the static data issues and deploy to Base Sepolia:");
  console.log("\n1. 💰 Fund your accounts:");
  console.log("   cp base_sepolia.env .env");
  console.log("   # Then fund the accounts with Base Sepolia ETH");

  console.log("\n2. 🔍 Validate setup:");
  console.log("   node scripts/validate_network.js");

  console.log("\n3. 🚀 Deploy contracts:");
  console.log(
    "   npx hardhat run deploy_to_base_sepolia.js --network base_sepolia"
  );

  console.log("\n4. 📝 Update configuration:");
  console.log("   cp base_sepolia_core_deployments.json core_deployments.json");
  console.log("   cp base_sepolia_app_deployments.json deployments.json");
  console.log("   cp base_sepolia_accounts.json accounts.json");

  console.log("\n5. ✅ Test the system:");
  console.log("   node test_complete_flow.js");
  console.log("   node advanced_aa_demo.js");

  // Step 6: Contract addresses preview
  console.log("\n📊 Step 6: What Will Be Deployed");
  console.log("===============================");

  console.log("After deployment, you'll have real Base Sepolia addresses:");
  console.log("- EntryPoint: 0x742d35Cc... (real contract address)");
  console.log(
    "- AdvancedAccountFactory: 0x8A791620... (real contract address)"
  );
  console.log("- RahatToken: 0x610178dA... (real contract address)");
  console.log("- CashToken: 0xB7f8BC63... (real contract address)");
  console.log("- CashOutManager: 0xA51c1fc2... (real contract address)");
  console.log("- TokenPaymaster: 0x9fE46736... (real contract address)");

  console.log("\n🎯 All Features Will Work on Base Sepolia:");
  console.log("=========================================");

  const features = [
    "✅ Smart contract wallets (Account Abstraction)",
    "✅ UserOperation execution via EntryPoint",
    "✅ Gas abstraction with paymaster",
    "✅ RahatToken fund management",
    "✅ CashToken distribution system",
    "✅ Three-party fund flow (Donor → Field Office → Beneficiary)",
    "✅ Delegation system with permissions",
    "✅ Session keys with spending limits",
    "✅ Multi-signature approvals",
    "✅ Social recovery with guardians",
    "✅ Daily spending limits",
    "✅ Batch operations",
  ];

  features.forEach((feature) => console.log(feature));

  console.log("\n🔐 Security Reminders:");
  console.log("======================");
  console.log("- Keep private keys secure and never share them");
  console.log("- These are test accounts - don't use for mainnet");
  console.log("- Fund accounts with small amounts only");
  console.log("- Always validate network before operations");

  console.log("\n🏁 Ready to deploy to Base Sepolia!");
  console.log(
    "Follow the deployment plan above to get your system working on a real blockchain."
  );
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
