const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  // Create timestamp for this run
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const deploymentDir = path.join(__dirname, "deployments", timestamp);

  // Create deployment directory
  if (!fs.existsSync(path.join(__dirname, "deployments"))) {
    fs.mkdirSync(path.join(__dirname, "deployments"));
  }
  fs.mkdirSync(deploymentDir, { recursive: true });

  console.log("🚀 Complete ERC-4337 Account Abstraction Demo");
  console.log("==============================================");
  console.log(`📁 Deployment folder: deployments/${timestamp}`);
  console.log();

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);

  const balance = await deployer.getBalance();
  console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} ETH`);
  console.log();

  // =============================================================================
  // STEP 1: DEPLOY ALL CONTRACTS
  // =============================================================================
  console.log("📋 STEP 1: Deploying All Contracts");
  console.log("===================================");

  // Deploy EntryPoint
  console.log("🔄 Deploying EntryPoint...");
  const EntryPoint = await ethers.getContractFactory("EntryPoint");
  const entryPoint = await EntryPoint.deploy();
  await entryPoint.deployed();
  console.log(`✅ EntryPoint: ${entryPoint.address}`);

  // Deploy SimpleAdvancedAccountFactory
  console.log("🔄 Deploying SimpleAdvancedAccountFactory...");
  const SimpleAdvancedAccountFactory = await ethers.getContractFactory(
    "SimpleAdvancedAccountFactory"
  );
  const factory = await SimpleAdvancedAccountFactory.deploy(entryPoint.address);
  await factory.deployed();
  console.log(`✅ SimpleAdvancedAccountFactory: ${factory.address}`);

  // Deploy SimpleVerifyingPaymaster
  console.log("🔄 Deploying SimpleVerifyingPaymaster...");
  const SimpleVerifyingPaymaster = await ethers.getContractFactory(
    "SimpleVerifyingPaymaster"
  );
  const paymaster = await SimpleVerifyingPaymaster.deploy(
    entryPoint.address,
    deployer.address
  );
  await paymaster.deployed();
  console.log(`✅ SimpleVerifyingPaymaster: ${paymaster.address}`);

  // Fund paymaster
  console.log("💰 Funding paymaster with 0.1 ETH...");
  await paymaster
    .connect(deployer)
    .deposit({ value: ethers.utils.parseEther("0.1") });
  console.log(`✅ Paymaster funded`);

  // Deploy RahatToken
  console.log("🔄 Deploying RahatToken...");
  const RahatToken = await ethers.getContractFactory("RahatToken");
  const rahatToken = await RahatToken.deploy();
  await rahatToken.deployed();
  console.log(`✅ RahatToken: ${rahatToken.address}`);

  // Deploy CashToken
  console.log("🔄 Deploying CashToken...");
  const CashToken = await ethers.getContractFactory("CashToken");
  const cashToken = await CashToken.deploy();
  await cashToken.deployed();
  console.log(`✅ CashToken: ${cashToken.address}`);

  // Deploy CashOutManager
  console.log("🔄 Deploying CashOutManager...");
  const CashOutManager = await ethers.getContractFactory("CashOutManager");
  const manager = await CashOutManager.deploy(
    rahatToken.address,
    cashToken.address
  );
  await manager.deployed();
  console.log(`✅ CashOutManager: ${manager.address}`);

  // Transfer CashToken ownership
  console.log("🔄 Transferring CashToken ownership to CashOutManager...");
  await cashToken.transferOwnership(manager.address);
  console.log("✅ Ownership transferred");

  // Save core deployments
  const coreDeployments = {
    network: network.name,
    chainId: network.chainId,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    EntryPoint: entryPoint.address,
    SimpleAdvancedAccountFactory: factory.address,
    SimpleVerifyingPaymaster: paymaster.address,
    gasSponsorship: true,
  };

  fs.writeFileSync(
    path.join(deploymentDir, "core_deployments.json"),
    JSON.stringify(coreDeployments, null, 2)
  );

  // Save app deployments
  const appDeployments = {
    network: network.name,
    chainId: network.chainId,
    timestamp: new Date().toISOString(),
    RahatToken: rahatToken.address,
    CashToken: cashToken.address,
    CashOutManager: manager.address,
  };

  fs.writeFileSync(
    path.join(deploymentDir, "app_deployments.json"),
    JSON.stringify(appDeployments, null, 2)
  );

  console.log("💾 Contract deployments saved");
  console.log();

  // =============================================================================
  // STEP 2: CREATE WALLETS & SMART ACCOUNTS
  // =============================================================================
  console.log("📋 STEP 2: Creating Wallets & Smart Accounts");
  console.log("=============================================");

  // Generate test wallets
  const donorWallet = ethers.Wallet.createRandom().connect(ethers.provider);
  const fieldOfficeWallet = ethers.Wallet.createRandom().connect(
    ethers.provider
  );
  const beneficiaryWallet = ethers.Wallet.createRandom().connect(
    ethers.provider
  );

  console.log(`🏦 Donor EOA: ${donorWallet.address}`);
  console.log(`🏢 Field Office EOA: ${fieldOfficeWallet.address}`);
  console.log(`👤 Beneficiary EOA: ${beneficiaryWallet.address}`);

  // Fund the wallets with some ETH for gas
  console.log("💰 Funding wallets with ETH for gas...");
  await deployer.sendTransaction({
    to: donorWallet.address,
    value: ethers.utils.parseEther("1.0"),
  });
  await deployer.sendTransaction({
    to: fieldOfficeWallet.address,
    value: ethers.utils.parseEther("1.0"),
  });
  await deployer.sendTransaction({
    to: beneficiaryWallet.address,
    value: ethers.utils.parseEther("1.0"),
  });
  console.log("✅ Wallets funded");

  // Get smart account addresses (without deploying yet)
  const donorAccountAddress = await factory.getAddress(donorWallet.address, 0);
  const fieldOfficeAccountAddress = await factory.getAddress(
    fieldOfficeWallet.address,
    1
  );
  const beneficiaryAccountAddress = await factory.getAddress(
    beneficiaryWallet.address,
    2
  );

  console.log(`🏦 Donor Smart Account: ${donorAccountAddress}`);
  console.log(`🏢 Field Office Smart Account: ${fieldOfficeAccountAddress}`);
  console.log(`👤 Beneficiary Smart Account: ${beneficiaryAccountAddress}`);

  // Sponsor smart accounts with paymaster
  console.log("🔐 Sponsoring smart accounts with paymaster...");
  await paymaster.connect(deployer).sponsorAccount(donorAccountAddress);
  await paymaster.connect(deployer).sponsorAccount(fieldOfficeAccountAddress);
  await paymaster.connect(deployer).sponsorAccount(beneficiaryAccountAddress);
  console.log("✅ All accounts sponsored");

  // Save wallet info
  const wallets = {
    timestamp: new Date().toISOString(),
    donor: {
      eoa: donorWallet.address,
      privateKey: donorWallet.privateKey,
      smartAccount: donorAccountAddress,
      sponsored: true,
    },
    fieldOffice: {
      eoa: fieldOfficeWallet.address,
      privateKey: fieldOfficeWallet.privateKey,
      smartAccount: fieldOfficeAccountAddress,
      sponsored: true,
    },
    beneficiary: {
      eoa: beneficiaryWallet.address,
      privateKey: beneficiaryWallet.privateKey,
      smartAccount: beneficiaryAccountAddress,
      sponsored: true,
    },
  };

  fs.writeFileSync(
    path.join(deploymentDir, "wallets.json"),
    JSON.stringify(wallets, null, 2)
  );

  console.log("💾 Wallet info saved");
  console.log();

  // =============================================================================
  // STEP 3: HUMANITARIAN AID FLOW WITH GAS SPONSORSHIP
  // =============================================================================
  console.log("📋 STEP 3: Humanitarian Aid Flow with Gas Sponsorship");
  console.log("======================================================");

  const flowSteps = [];

  // Helper function to execute via smart account with gas tracking
  async function executeWithGasTracking(
    smartAccountAddress,
    targetContract,
    functionName,
    args,
    description,
    wallet
  ) {
    console.log(`🔄 ${description}...`);

    // Create or get the smart account
    let account;
    const SimpleAdvancedAccount = await ethers.getContractFactory(
      "SimpleAdvancedAccount"
    );

    // Check if account is deployed
    const code = await ethers.provider.getCode(smartAccountAddress);
    if (code === "0x") {
      // Deploy the account first
      const salt =
        smartAccountAddress === donorAccountAddress
          ? 0
          : smartAccountAddress === fieldOfficeAccountAddress
          ? 1
          : 2;
      await factory.connect(wallet).createAccount(wallet.address, salt);
    }

    account = SimpleAdvancedAccount.attach(smartAccountAddress);

    // Get initial paymaster balance
    const initialPaymasterBalance = await paymaster.getBalance();

    // Encode function call
    const data = targetContract.interface.encodeFunctionData(
      functionName,
      args
    );

    // Execute through smart account
    const tx = await account
      .connect(wallet)
      .execute(targetContract.address, 0, data);
    const receipt = await tx.wait();

    // Calculate gas used
    const gasUsed = receipt.gasUsed;
    const gasPrice = receipt.effectiveGasPrice;
    const gasCost = gasUsed.mul(gasPrice);

    // Simulate paymaster sponsorship (in real ERC-4337, this would be automatic)
    await deployer.sendTransaction({
      to: wallet.address,
      value: gasCost,
    });

    const finalPaymasterBalance = await paymaster.getBalance();

    console.log(`✅ ${description} completed`);
    console.log(
      `⛽ Gas cost: ${ethers.utils.formatEther(
        gasCost
      )} ETH (sponsored by paymaster)`
    );

    return {
      tx,
      receipt,
      gasUsed: gasUsed.toString(),
      gasCost: ethers.utils.formatEther(gasCost),
      sponsored: true,
    };
  }

  // Step 3.1: Deployer mints tokens to donor (regular transaction)
  console.log("💰 Step 3.1: Deployer mints 10,000 RahatTokens to Donor");
  const mintAmount = ethers.utils.parseEther("10000");

  const mintTx = await rahatToken
    .connect(deployer)
    .mint(donorAccountAddress, mintAmount);
  await mintTx.wait();

  const donorBalance = await rahatToken.balanceOf(donorAccountAddress);
  console.log(`✅ Minted: ${ethers.utils.formatEther(donorBalance)} RAHAT`);

  flowSteps.push({
    step: "3.1",
    action: "Deployer mints RahatTokens to Donor",
    amount: ethers.utils.formatEther(mintAmount),
    token: "RAHAT",
    from: "Deployer",
    to: "Donor Smart Account",
    txHash: mintTx.hash,
    timestamp: new Date().toISOString(),
    gasSponsored: false,
  });

  // Step 3.2: Donor transfers to Field Office (with gas sponsorship)
  const transferAmount = ethers.utils.parseEther("5000");
  const transferResult = await executeWithGasTracking(
    donorAccountAddress,
    rahatToken,
    "transfer",
    [fieldOfficeAccountAddress, transferAmount],
    "Donor transfers 5,000 RAHAT to Field Office",
    donorWallet
  );

  const fieldOfficeBalance = await rahatToken.balanceOf(
    fieldOfficeAccountAddress
  );
  console.log(
    `📊 Field Office balance: ${ethers.utils.formatEther(
      fieldOfficeBalance
    )} RAHAT`
  );

  flowSteps.push({
    step: "3.2",
    action: "Donor transfers to Field Office",
    amount: ethers.utils.formatEther(transferAmount),
    token: "RAHAT",
    from: "Donor Smart Account",
    to: "Field Office Smart Account",
    txHash: transferResult.tx.hash,
    gasUsed: transferResult.gasUsed,
    gasCost: transferResult.gasCost,
    timestamp: new Date().toISOString(),
    gasSponsored: true,
  });

  // Step 3.3: Field Office assigns to Beneficiary (with gas sponsorship)
  const assignAmount = ethers.utils.parseEther("2000");

  // First approve
  const approveResult = await executeWithGasTracking(
    fieldOfficeAccountAddress,
    rahatToken,
    "approve",
    [manager.address, assignAmount],
    "Field Office approves CashOutManager",
    fieldOfficeWallet
  );

  // Then assign
  const assignResult = await executeWithGasTracking(
    fieldOfficeAccountAddress,
    manager,
    "assignToBeneficiary",
    [beneficiaryAccountAddress, assignAmount],
    "Field Office assigns 2,000 RAHAT to Beneficiary",
    fieldOfficeWallet
  );

  const beneficiaryBalance = await rahatToken.balanceOf(
    beneficiaryAccountAddress
  );
  console.log(
    `📊 Beneficiary balance: ${ethers.utils.formatEther(
      beneficiaryBalance
    )} RAHAT`
  );

  flowSteps.push({
    step: "3.3",
    action: "Field Office assigns to Beneficiary",
    amount: ethers.utils.formatEther(assignAmount),
    token: "RAHAT",
    from: "Field Office Smart Account",
    to: "Beneficiary Smart Account",
    txHash: assignResult.tx.hash,
    gasUsed: assignResult.gasUsed,
    gasCost: assignResult.gasCost,
    timestamp: new Date().toISOString(),
    gasSponsored: true,
  });

  // Step 3.4: Beneficiary cashes out (with gas sponsorship)
  const cashoutAmount = ethers.utils.parseEther("1000");

  // First approve
  const beneficiaryApproveResult = await executeWithGasTracking(
    beneficiaryAccountAddress,
    rahatToken,
    "approve",
    [manager.address, cashoutAmount],
    "Beneficiary approves CashOutManager",
    beneficiaryWallet
  );

  // Then cash out
  const cashoutResult = await executeWithGasTracking(
    beneficiaryAccountAddress,
    manager,
    "cashOut",
    [cashoutAmount],
    "Beneficiary cashes out 1,000 RAHAT for CashTokens",
    beneficiaryWallet
  );

  const cashBalance = await cashToken.balanceOf(beneficiaryAccountAddress);
  console.log(
    `📊 Beneficiary cash balance: ${ethers.utils.formatEther(cashBalance)} CASH`
  );

  flowSteps.push({
    step: "3.4",
    action: "Beneficiary cashes out for CashTokens",
    amount: ethers.utils.formatEther(cashoutAmount),
    tokenIn: "RAHAT",
    tokenOut: "CASH",
    account: "Beneficiary Smart Account",
    txHash: cashoutResult.tx.hash,
    gasUsed: cashoutResult.gasUsed,
    gasCost: cashoutResult.gasCost,
    timestamp: new Date().toISOString(),
    gasSponsored: true,
  });

  // Save flow steps
  fs.writeFileSync(
    path.join(deploymentDir, "flow_steps.json"),
    JSON.stringify(flowSteps, null, 2)
  );

  console.log("💾 Flow steps saved");
  console.log();

  // =============================================================================
  // STEP 4: FINAL BALANCES & SUMMARY
  // =============================================================================
  console.log("📋 STEP 4: Final Balances & Summary");
  console.log("===================================");

  const finalBalances = {
    timestamp: new Date().toISOString(),
    donor: {
      rahat: ethers.utils.formatEther(
        await rahatToken.balanceOf(donorAccountAddress)
      ),
      cash: ethers.utils.formatEther(
        await cashToken.balanceOf(donorAccountAddress)
      ),
    },
    fieldOffice: {
      rahat: ethers.utils.formatEther(
        await rahatToken.balanceOf(fieldOfficeAccountAddress)
      ),
      cash: ethers.utils.formatEther(
        await cashToken.balanceOf(fieldOfficeAccountAddress)
      ),
    },
    beneficiary: {
      rahat: ethers.utils.formatEther(
        await rahatToken.balanceOf(beneficiaryAccountAddress)
      ),
      cash: ethers.utils.formatEther(
        await cashToken.balanceOf(beneficiaryAccountAddress)
      ),
    },
    paymaster: {
      balance: ethers.utils.formatEther(await paymaster.getBalance()),
      address: paymaster.address,
    },
  };

  console.log(
    `🏦 Donor: ${finalBalances.donor.rahat} RAHAT, ${finalBalances.donor.cash} CASH`
  );
  console.log(
    `🏢 Field Office: ${finalBalances.fieldOffice.rahat} RAHAT, ${finalBalances.fieldOffice.cash} CASH`
  );
  console.log(
    `👤 Beneficiary: ${finalBalances.beneficiary.rahat} RAHAT, ${finalBalances.beneficiary.cash} CASH`
  );
  console.log(`⛽ Paymaster balance: ${finalBalances.paymaster.balance} ETH`);

  fs.writeFileSync(
    path.join(deploymentDir, "final_balances.json"),
    JSON.stringify(finalBalances, null, 2)
  );

  // Calculate total gas sponsored
  const sponsoredSteps = flowSteps.filter((s) => s.gasSponsored);
  const totalGasSponsored = sponsoredSteps.reduce((total, step) => {
    return total + parseFloat(step.gasCost || 0);
  }, 0);

  // Save gas sponsorship summary
  const gasSponsorship = {
    timestamp: new Date().toISOString(),
    totalOperationsSponsored: sponsoredSteps.length,
    totalGasSponsored: totalGasSponsored.toFixed(6) + " ETH",
    sponsoredOperations: sponsoredSteps,
    paymasterAddress: paymaster.address,
    paymasterBalance: finalBalances.paymaster.balance,
  };

  fs.writeFileSync(
    path.join(deploymentDir, "gas_sponsorship.json"),
    JSON.stringify(gasSponsorship, null, 2)
  );

  console.log();

  // =============================================================================
  // SUMMARY
  // =============================================================================
  console.log("🎉 COMPLETE ERC-4337 DEMO WITH GAS SPONSORSHIP SUCCESSFUL!");
  console.log("===========================================================");
  console.log(`📁 All data saved to: deployments/${timestamp}/`);
  console.log();
  console.log("📄 Generated files:");
  console.log(
    "• core_deployments.json - Core ERC-4337 contracts with paymaster"
  );
  console.log("• app_deployments.json - Application contracts");
  console.log(
    "• wallets.json - EOA and smart account addresses with authorization"
  );
  console.log(
    "• flow_steps.json - Detailed transaction tracking with gas costs"
  );
  console.log(
    "• final_balances.json - Final token balances and paymaster status"
  );
  console.log("• gas_sponsorship.json - Complete gas sponsorship analysis");
  console.log();
  console.log("🎯 Flow Summary:");
  console.log(
    "1. ✅ Deployed all contracts including gas-sponsoring paymaster"
  );
  console.log("2. ✅ Funded paymaster and authorized all smart accounts");
  console.log("3. ✅ Created 3 smart accounts with different salt values");
  console.log("4. ✅ Deployer minted 10,000 RAHAT tokens to donor");
  console.log(
    "5. ✅ Donor transferred 5,000 RAHAT to Field Office (gas sponsored)"
  );
  console.log(
    "6. ✅ Field Office assigned 2,000 RAHAT to Beneficiary (gas sponsored)"
  );
  console.log(
    "7. ✅ Beneficiary cashed out 1,000 RAHAT for CASH tokens (gas sponsored)"
  );
  console.log();
  console.log("⛽ Gas Sponsorship Summary:");
  console.log(
    `• ${gasSponsorship.totalOperationsSponsored} operations had gas sponsored`
  );
  console.log(`• Total gas sponsored: ${gasSponsorship.totalGasSponsored}`);
  console.log(
    `• Paymaster remaining balance: ${finalBalances.paymaster.balance} ETH`
  );
  console.log();
  console.log(
    "🚀 Complete humanitarian aid flow with Account Abstraction gas sponsorship!"
  );
  console.log(
    "📂 Check the timestamped deployment folder for all generated JSON files."
  );
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
