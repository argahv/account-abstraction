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

  console.log("🚀 Complete ERC-4337 Demo Flow");
  console.log("==============================");
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

  // Deploy AdvancedAccountFactory
  console.log("🔄 Deploying AdvancedAccountFactory...");
  const AdvancedAccountFactory = await ethers.getContractFactory(
    "AdvancedAccountFactory"
  );
  const factory = await AdvancedAccountFactory.deploy(entryPoint.address);
  await factory.deployed();
  console.log(`✅ AdvancedAccountFactory: ${factory.address}`);

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
    EntryPoint: entryPoint.address,
    AdvancedAccountFactory: factory.address,
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
  // STEP 2: CREATE WALLETS
  // =============================================================================
  console.log("📋 STEP 2: Creating Wallets");
  console.log("============================");

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

  // Fund the wallets
  console.log("💰 Funding wallets...");
  await deployer.sendTransaction({
    to: donorWallet.address,
    value: ethers.utils.parseEther("0.01"),
  });
  await deployer.sendTransaction({
    to: fieldOfficeWallet.address,
    value: ethers.utils.parseEther("0.01"),
  });
  await deployer.sendTransaction({
    to: beneficiaryWallet.address,
    value: ethers.utils.parseEther("0.01"),
  });
  console.log("✅ Wallets funded");

  // Create smart accounts
  console.log("🔄 Creating smart accounts...");

  const donorAccountAddress = await factory.getAddress(donorWallet.address, 0);
  const fieldOfficeAccountAddress = await factory.getAddress(
    fieldOfficeWallet.address,
    1
  );
  const beneficiaryAccountAddress = await factory.getAddress(
    beneficiaryWallet.address,
    2
  );

  // Create accounts
  await factory.connect(donorWallet).createAccount(donorWallet.address, 0);
  await factory
    .connect(fieldOfficeWallet)
    .createAccount(fieldOfficeWallet.address, 1);
  await factory
    .connect(beneficiaryWallet)
    .createAccount(beneficiaryWallet.address, 2);

  console.log(`🏦 Donor Smart Account: ${donorAccountAddress}`);
  console.log(`🏢 Field Office Smart Account: ${fieldOfficeAccountAddress}`);
  console.log(`👤 Beneficiary Smart Account: ${beneficiaryAccountAddress}`);

  // Save wallet info
  const wallets = {
    timestamp: new Date().toISOString(),
    donor: {
      eoa: donorWallet.address,
      privateKey: donorWallet.privateKey,
      smartAccount: donorAccountAddress,
    },
    fieldOffice: {
      eoa: fieldOfficeWallet.address,
      privateKey: fieldOfficeWallet.privateKey,
      smartAccount: fieldOfficeAccountAddress,
    },
    beneficiary: {
      eoa: beneficiaryWallet.address,
      privateKey: beneficiaryWallet.privateKey,
      smartAccount: beneficiaryAccountAddress,
    },
  };

  fs.writeFileSync(
    path.join(deploymentDir, "wallets.json"),
    JSON.stringify(wallets, null, 2)
  );

  console.log("💾 Wallet info saved");
  console.log();

  // =============================================================================
  // STEP 3: HUMANITARIAN AID FLOW
  // =============================================================================
  console.log("📋 STEP 3: Humanitarian Aid Flow");
  console.log("==================================");

  // Get account contracts
  const AdvancedAccount = await ethers.getContractFactory("AdvancedAccount");
  const donorAccount = AdvancedAccount.attach(donorAccountAddress);
  const fieldOfficeAccount = AdvancedAccount.attach(fieldOfficeAccountAddress);
  const beneficiaryAccount = AdvancedAccount.attach(beneficiaryAccountAddress);

  const flowSteps = [];

  // Step 3.1: Deployer mints tokens to donor
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
  });

  // Step 3.2: Donor transfers to Field Office
  console.log("📤 Step 3.2: Donor transfers 5,000 RAHAT to Field Office");
  const transferAmount = ethers.utils.parseEther("5000");
  const transferData = rahatToken.interface.encodeFunctionData("transfer", [
    fieldOfficeAccountAddress,
    transferAmount,
  ]);

  const transferTx = await donorAccount
    .connect(donorWallet)
    .execute(rahatToken.address, 0, transferData);
  await transferTx.wait();

  const fieldOfficeBalance = await rahatToken.balanceOf(
    fieldOfficeAccountAddress
  );
  console.log(
    `✅ Transferred: ${ethers.utils.formatEther(
      fieldOfficeBalance
    )} RAHAT to Field Office`
  );

  flowSteps.push({
    step: "3.2",
    action: "Donor transfers to Field Office",
    amount: ethers.utils.formatEther(transferAmount),
    token: "RAHAT",
    from: "Donor Smart Account",
    to: "Field Office Smart Account",
    txHash: transferTx.hash,
    timestamp: new Date().toISOString(),
  });

  // Step 3.3: Field Office assigns to Beneficiary
  console.log("📋 Step 3.3: Field Office assigns 2,000 RAHAT to Beneficiary");
  const assignAmount = ethers.utils.parseEther("2000");

  // Approve CashOutManager
  const approveData = rahatToken.interface.encodeFunctionData("approve", [
    manager.address,
    assignAmount,
  ]);
  const approveTx = await fieldOfficeAccount
    .connect(fieldOfficeWallet)
    .execute(rahatToken.address, 0, approveData);
  await approveTx.wait();

  // Assign tokens
  const assignData = manager.interface.encodeFunctionData(
    "assignToBeneficiary",
    [beneficiaryAccountAddress, assignAmount]
  );
  const assignTx = await fieldOfficeAccount
    .connect(fieldOfficeWallet)
    .execute(manager.address, 0, assignData);
  await assignTx.wait();

  const beneficiaryBalance = await rahatToken.balanceOf(
    beneficiaryAccountAddress
  );
  console.log(
    `✅ Assigned: ${ethers.utils.formatEther(
      beneficiaryBalance
    )} RAHAT to Beneficiary`
  );

  flowSteps.push({
    step: "3.3",
    action: "Field Office assigns to Beneficiary",
    amount: ethers.utils.formatEther(assignAmount),
    token: "RAHAT",
    from: "Field Office Smart Account",
    to: "Beneficiary Smart Account",
    txHash: assignTx.hash,
    timestamp: new Date().toISOString(),
  });

  // Step 3.4: Beneficiary cashes out
  console.log("💵 Step 3.4: Beneficiary cashes out 1,000 RAHAT for CashTokens");
  const cashoutAmount = ethers.utils.parseEther("1000");

  // Approve CashOutManager
  const beneficiaryApproveData = rahatToken.interface.encodeFunctionData(
    "approve",
    [manager.address, cashoutAmount]
  );
  const beneficiaryApproveTx = await beneficiaryAccount
    .connect(beneficiaryWallet)
    .execute(rahatToken.address, 0, beneficiaryApproveData);
  await beneficiaryApproveTx.wait();

  // Cash out
  const cashoutData = manager.interface.encodeFunctionData("cashOut", [
    cashoutAmount,
  ]);
  const cashoutTx = await beneficiaryAccount
    .connect(beneficiaryWallet)
    .execute(manager.address, 0, cashoutData);
  await cashoutTx.wait();

  const cashBalance = await cashToken.balanceOf(beneficiaryAccountAddress);
  console.log(
    `✅ Cashed out: ${ethers.utils.formatEther(cashBalance)} CASH received`
  );

  flowSteps.push({
    step: "3.4",
    action: "Beneficiary cashes out for CashTokens",
    amount: ethers.utils.formatEther(cashoutAmount),
    tokenIn: "RAHAT",
    tokenOut: "CASH",
    account: "Beneficiary Smart Account",
    txHash: cashoutTx.hash,
    timestamp: new Date().toISOString(),
  });

  // Save flow steps
  fs.writeFileSync(
    path.join(deploymentDir, "flow_steps.json"),
    JSON.stringify(flowSteps, null, 2)
  );

  console.log("💾 Flow steps saved");
  console.log();

  // =============================================================================
  // STEP 4: FINAL BALANCES
  // =============================================================================
  console.log("📋 STEP 4: Final Balances");
  console.log("=========================");

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

  fs.writeFileSync(
    path.join(deploymentDir, "final_balances.json"),
    JSON.stringify(finalBalances, null, 2)
  );

  console.log();

  // =============================================================================
  // SUMMARY
  // =============================================================================
  console.log("🎉 COMPLETE DEMO FLOW SUCCESSFUL!");
  console.log("==================================");
  console.log(`📁 All data saved to: deployments/${timestamp}/`);
  console.log();
  console.log("📄 Generated files:");
  console.log("• core_deployments.json - Core ERC-4337 contracts");
  console.log("• app_deployments.json - Application contracts");
  console.log("• wallets.json - EOA and smart account addresses");
  console.log("• flow_steps.json - Detailed transaction tracking");
  console.log("• final_balances.json - Final token balances");
  console.log();
  console.log("🎯 Flow Summary:");
  console.log("1. ✅ Deployed all contracts");
  console.log("2. ✅ Created 3 wallets with smart accounts");
  console.log("3. ✅ Donor minted 10,000 RAHAT tokens");
  console.log("4. ✅ Donor transferred 5,000 RAHAT to Field Office");
  console.log("5. ✅ Field Office assigned 2,000 RAHAT to Beneficiary");
  console.log("6. ✅ Beneficiary cashed out 1,000 RAHAT for CASH tokens");
  console.log();
  console.log("🚀 Complete humanitarian aid flow via Account Abstraction!");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
