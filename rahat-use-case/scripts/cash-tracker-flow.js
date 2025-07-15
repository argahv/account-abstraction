const { ethers } = require("hardhat");
const fs = require("fs");

const CONFIG = {
  networks: {
    local: { chainId: 31337, name: "Hardhat Local" },
    testnet: { chainId: 84532, name: "Base Sepolia" },
    mainnet: { chainId: 8453, name: "Base Mainnet" },
  },
  gasSettings: {
    local: {
      maxFeePerGas: ethers.utils.parseUnits("50", "gwei"),
      maxPriorityFeePerGas: ethers.utils.parseUnits("5", "gwei"),
      callGasLimit: 800000,
      verificationGasLimit: 600000,
      preVerificationGas: 100000,
      paymasterFunding: "0.01",
    },
    testnet: {
      maxFeePerGas: ethers.utils.parseUnits("0.03", "gwei"),
      maxPriorityFeePerGas: ethers.utils.parseUnits("0.01", "gwei"),
      callGasLimit: 700000,
      verificationGasLimit: 400000,
      preVerificationGas: 80000,
      paymasterFunding: "0.005",
    },
  },
  tokenAmounts: {
    initialMint: "1000", // Deployer mints to Field Manager
    assignAmount: "500", // Field Manager assigns to Beneficiary
    cashOutAmount: "300", // Amount for cash-out handshake
  },
};

class Logger {
  static success(message, details = {}) {
    console.log(`✅ ${message}`);
    if (Object.keys(details).length > 0) {
      Object.entries(details).forEach(([key, value]) =>
        console.log(`   ${key}: ${value}`)
      );
    }
  }

  static info(message, details = {}) {
    console.log(`ℹ️  ${message}`);
    if (Object.keys(details).length > 0) {
      Object.entries(details).forEach(([key, value]) =>
        console.log(`   ${key}: ${value}`)
      );
    }
  }

  static error(message, error = null) {
    console.log(`❌ ${message}`);
    if (error) console.log(`   Error: ${error.message}`);
  }

  static divider(title) {
    console.log(
      `\n${"=".repeat(80)}\n${title.toUpperCase()}\n${"=".repeat(80)}`
    );
  }

  static warning(message) {
    console.log(`⚠️  ${message}`);
  }

  static step(stepNumber, description) {
    console.log(`\n🔹 Step ${stepNumber}: ${description}`);
  }
}

class NetworkManager {
  constructor() {
    this.network = null;
    this.gasSettings = null;
    this.networkType = null;
  }

  async initialize() {
    this.network = await ethers.provider.getNetwork();
    this.networkType = this._getNetworkType();
    this.gasSettings = CONFIG.gasSettings[this.networkType];

    Logger.info("Network Information", {
      Name: this.network.name || "Unknown",
      "Chain ID": this.network.chainId,
      Type: this.networkType,
      "Max Fee": `${ethers.utils.formatUnits(
        this.gasSettings.maxFeePerGas,
        "gwei"
      )} gwei`,
      "Priority Fee": `${ethers.utils.formatUnits(
        this.gasSettings.maxPriorityFeePerGas,
        "gwei"
      )} gwei`,
    });
  }

  _getNetworkType() {
    if (this.network.chainId === CONFIG.networks.local.chainId) return "local";
    if (this.network.chainId === CONFIG.networks.testnet.chainId)
      return "testnet";
    if (this.network.chainId === CONFIG.networks.mainnet.chainId)
      return "mainnet";
    return "local"; // Default to local for unknown networks
  }

  getPaymasterFunding() {
    return ethers.utils.parseEther(this.gasSettings.paymasterFunding);
  }
}

class CashOutHandshakeFlow {
  constructor() {
    this.contracts = {};
    this.wallets = {};
    this.smartAccounts = {};
    this.networkManager = new NetworkManager();
    this.deployer = null;
    this.transactionHistory = [];
  }

  async initialize() {
    Logger.divider("Initializing Cash-Out Handshake Flow");

    await this.networkManager.initialize();

    const signers = await ethers.getSigners();
    if (signers.length === 0) {
      throw new Error(
        "No signers available. Please check your network configuration and ensure PRIVATE_KEY is set in .env."
      );
    }
    this.deployer = signers[0];
    Logger.info("Deployer address", { Address: this.deployer.address });
    Logger.info("Deployer balance", {
      Balance: ethers.utils.formatEther(await this.deployer.getBalance()),
    });

    // Create wallets for the specific flow
    this.wallets = {
      deployer: this.deployer,
      fieldManager: ethers.Wallet.createRandom().connect(ethers.provider),
      beneficiary: ethers.Wallet.createRandom().connect(ethers.provider),
    };

    Logger.success("Wallets created", {
      "🏭 Deployer": this.wallets.deployer.address,
      "🏢 Field Manager": this.wallets.fieldManager.address,
      "👤 Beneficiary": this.wallets.beneficiary.address,
    });
  }

  async deployContracts() {
    Logger.divider("Deploying Contracts");

    // Deploy EntryPoint
    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    this.contracts.entryPoint = await EntryPoint.connect(
      this.deployer
    ).deploy();
    await this.contracts.entryPoint.deployed();
    Logger.success("EntryPoint deployed", {
      Address: this.contracts.entryPoint.address,
    });

    // Deploy RahatToken
    const RahatToken = await ethers.getContractFactory("RahatToken");
    this.contracts.rahatToken = await RahatToken.connect(
      this.deployer
    ).deploy();
    await this.contracts.rahatToken.deployed();
    Logger.success("RahatToken deployed", {
      Address: this.contracts.rahatToken.address,
    });

    // Deploy CashToken
    const CashToken = await ethers.getContractFactory("CashToken");
    this.contracts.cashToken = await CashToken.connect(this.deployer).deploy();
    await this.contracts.cashToken.deployed();
    Logger.success("CashToken deployed", {
      Address: this.contracts.cashToken.address,
    });

    // Deploy SimpleVerifyingPaymaster
    const SimpleVerifyingPaymaster = await ethers.getContractFactory(
      "SimpleVerifyingPaymaster"
    );
    this.contracts.paymaster = await SimpleVerifyingPaymaster.connect(
      this.deployer
    ).deploy(this.contracts.entryPoint.address, this.deployer.address);
    await this.contracts.paymaster.deployed();
    Logger.success("SimpleVerifyingPaymaster deployed", {
      Address: this.contracts.paymaster.address,
    });

    // Deploy SimpleAdvancedAccountFactory
    const SimpleAdvancedAccountFactory = await ethers.getContractFactory(
      "SimpleAdvancedAccountFactory"
    );
    this.contracts.factory = await SimpleAdvancedAccountFactory.connect(
      this.deployer
    ).deploy(this.contracts.entryPoint.address);
    await this.contracts.factory.deployed();
    Logger.success("SimpleAdvancedAccountFactory deployed", {
      Address: this.contracts.factory.address,
    });
  }

  async setupSmartAccounts() {
    Logger.divider("Setting Up Smart Accounts");

    // Create smart account addresses for field manager and beneficiary
    this.smartAccounts = {
      fieldManager: await this.contracts.factory.getAddress(
        this.wallets.fieldManager.address,
        0
      ),
      beneficiary: await this.contracts.factory.getAddress(
        this.wallets.beneficiary.address,
        1
      ),
    };

    Logger.success("Smart Account addresses computed", {
      "🏢 Field Manager Smart Account": this.smartAccounts.fieldManager,
      "👤 Beneficiary Smart Account": this.smartAccounts.beneficiary,
    });

    // Sponsor all smart accounts
    for (const [role, address] of Object.entries(this.smartAccounts)) {
      await this.contracts.paymaster.sponsorAccount(address);
      Logger.success(`${role} account sponsored`, { Address: address });
    }

    // Fund the paymaster
    const paymasterFunding = this.networkManager.getPaymasterFunding();
    const depositTx = await this.contracts.entryPoint
      .connect(this.deployer)
      .depositTo(this.contracts.paymaster.address, { value: paymasterFunding });
    await depositTx.wait();

    const deposit = await this.contracts.entryPoint.balanceOf(
      this.contracts.paymaster.address
    );
    Logger.success("Paymaster funded", {
      Deposit: `${ethers.utils.formatEther(deposit)} ETH`,
      Purpose: "Sponsors gas for all UserOperations",
    });
  }

  async executeCompleteFlow() {
    Logger.divider("Executing Complete Cash-Out Handshake Flow");

    // Step 1: Deployer mints RahatToken to Field Manager
    await this.step1_DeployerMintsToFieldManager();

    // Step 2: Field Manager assigns RahatToken to Beneficiary
    await this.step2_FieldManagerAssignsToBeneficiary();

    // Step 3: Cash-out handshake between Beneficiary and Field Manager
    await this.step3_CashOutHandshake();

    // Step 4: Generate final report
    await this.generateFinalReport();
  }

  async step1_DeployerMintsToFieldManager() {
    Logger.step("1", "Deployer mints RahatToken to Field Manager");

    const mintAmount = ethers.utils.parseEther(CONFIG.tokenAmounts.initialMint);

    // Mint directly to Field Manager's smart account
    const mintTx = await this.contracts.rahatToken
      .connect(this.deployer)
      .mint(this.smartAccounts.fieldManager, mintAmount);
    await mintTx.wait();

    this.recordTransaction({
      step: "1",
      type: "Initial Mint",
      token: "RAHAT",
      from: "Deployer",
      to: "Field Manager Smart Account",
      amount: ethers.utils.formatEther(mintAmount),
      transaction: mintTx.hash,
      description: "Initial humanitarian aid token distribution",
    });

    const balance = await this.contracts.rahatToken.balanceOf(
      this.smartAccounts.fieldManager
    );
    Logger.success("RahatToken minted to Field Manager", {
      Amount: ethers.utils.formatEther(balance),
      Recipient: this.smartAccounts.fieldManager,
      Transaction: mintTx.hash,
    });
  }

  async step2_FieldManagerAssignsToBeneficiary() {
    Logger.step("2", "Field Manager assigns RahatToken to Beneficiary");

    const assignAmount = ethers.utils.parseEther(
      CONFIG.tokenAmounts.assignAmount
    );

    // Field Manager transfers to Beneficiary
    const assignUserOp = await this.buildUserOperation(
      this.smartAccounts.fieldManager,
      this.contracts.rahatToken,
      "transfer",
      [this.smartAccounts.beneficiary, assignAmount],
      this.wallets.fieldManager
    );

    const assignTx = await this.submitUserOperation(
      assignUserOp,
      "Field Manager assigns RahatToken to Beneficiary"
    );

    this.recordTransaction({
      step: "2",
      type: "Token Assignment",
      token: "RAHAT",
      from: "Field Manager Smart Account",
      to: "Beneficiary Smart Account",
      amount: ethers.utils.formatEther(assignAmount),
      transaction: assignTx.transactionHash,
      description: "Assignment of aid tokens to verified beneficiary",
    });

    const beneficiaryBalance = await this.contracts.rahatToken.balanceOf(
      this.smartAccounts.beneficiary
    );
    Logger.success("RahatToken assigned to Beneficiary", {
      Amount: ethers.utils.formatEther(beneficiaryBalance),
      "Field Manager Remaining": ethers.utils.formatEther(
        await this.contracts.rahatToken.balanceOf(
          this.smartAccounts.fieldManager
        )
      ),
    });
  }

  async step3_CashOutHandshake() {
    Logger.step("3", "Cash-Out Handshake Protocol");

    const cashOutAmount = ethers.utils.parseEther(
      CONFIG.tokenAmounts.cashOutAmount
    );

    Logger.info("Initiating mutual handshake for cash-out", {
      Amount: ethers.utils.formatEther(cashOutAmount),
      Protocol: "Mutual approve + transferFrom",
    });

    // 3a: Beneficiary approves Field Manager to spend RahatToken
    Logger.info("3a: Beneficiary approves Field Manager for RahatToken");
    const beneficiaryApproveUserOp = await this.buildUserOperation(
      this.smartAccounts.beneficiary,
      this.contracts.rahatToken,
      "approve",
      [this.smartAccounts.fieldManager, cashOutAmount],
      this.wallets.beneficiary
    );
    const beneficiaryApproveTx = await this.submitUserOperation(
      beneficiaryApproveUserOp,
      "Beneficiary approves Field Manager for RahatToken"
    );

    // 3b: Field Manager approves Beneficiary to receive CashToken (by pre-approving the deployer)
    Logger.info("3b: Field Manager signals approval for CashToken minting");
    // Note: In a real implementation, this would be Field Manager approving a CashToken contract
    // For this demo, we'll mint CashToken directly from deployer

    // 3c: Field Manager executes transferFrom to get RahatToken from Beneficiary
    Logger.info("3c: Field Manager executes transferFrom for RahatToken");
    const fieldManagerTransferFromUserOp = await this.buildUserOperation(
      this.smartAccounts.fieldManager,
      this.contracts.rahatToken,
      "transferFrom",
      [
        this.smartAccounts.beneficiary,
        this.smartAccounts.fieldManager,
        cashOutAmount,
      ],
      this.wallets.fieldManager
    );
    const fieldManagerTransferFromTx = await this.submitUserOperation(
      fieldManagerTransferFromUserOp,
      "Field Manager executes transferFrom for RahatToken"
    );

    // 3d: Mint CashToken to Beneficiary (completing the handshake)
    Logger.info("3d: Minting CashToken to Beneficiary");
    const mintCashTx = await this.contracts.cashToken
      .connect(this.deployer)
      .mint(this.smartAccounts.beneficiary, cashOutAmount);
    await mintCashTx.wait();

    this.recordTransaction({
      step: "3",
      type: "Cash-Out Handshake",
      tokenIn: "RAHAT",
      tokenOut: "CASH",
      amount: ethers.utils.formatEther(cashOutAmount),
      transactions: {
        beneficiaryApprove: beneficiaryApproveTx.transactionHash,
        fieldManagerTransferFrom: fieldManagerTransferFromTx.transactionHash,
        cashTokenMint: mintCashTx.hash,
      },
      description:
        "Mutual handshake protocol for cash-out: RahatToken → CashToken",
      protocol: "approve + transferFrom + mint",
    });

    // Show final balances
    const beneficiaryRahatBalance = await this.contracts.rahatToken.balanceOf(
      this.smartAccounts.beneficiary
    );
    const beneficiaryCashBalance = await this.contracts.cashToken.balanceOf(
      this.smartAccounts.beneficiary
    );
    const fieldManagerRahatBalance = await this.contracts.rahatToken.balanceOf(
      this.smartAccounts.fieldManager
    );

    Logger.success("Cash-out handshake completed", {
      "Beneficiary RahatToken": ethers.utils.formatEther(
        beneficiaryRahatBalance
      ),
      "Beneficiary CashToken": ethers.utils.formatEther(beneficiaryCashBalance),
      "Field Manager RahatToken": ethers.utils.formatEther(
        fieldManagerRahatBalance
      ),
      "Handshake Result":
        "✅ RahatToken transferred back, CashToken minted to Beneficiary",
    });
  }

  async buildUserOperation(
    smartAccountAddress,
    targetContract,
    functionName,
    args,
    wallet
  ) {
    // Prepare initCode for account deployment if needed
    let initCode = "0x";
    const code = await ethers.provider.getCode(smartAccountAddress);
    if (code === "0x") {
      const salt = this.getSaltForAccount(smartAccountAddress);
      const createCallData =
        this.contracts.factory.interface.encodeFunctionData("createAccount", [
          wallet.address,
          salt,
        ]);
      initCode = ethers.utils.hexConcat([
        this.contracts.factory.address,
        createCallData,
      ]);
    }

    // Encode function call
    const callData = targetContract.interface.encodeFunctionData(
      functionName,
      args
    );
    const SimpleAdvancedAccount = await ethers.getContractFactory(
      "SimpleAdvancedAccount"
    );
    const executeCallData = SimpleAdvancedAccount.interface.encodeFunctionData(
      "execute",
      [targetContract.address, 0, callData]
    );

    // Get nonce
    const nonce = await this.contracts.entryPoint.getNonce(
      smartAccountAddress,
      0
    );

    return {
      sender: smartAccountAddress,
      nonce: nonce,
      initCode: initCode,
      callData: executeCallData,
      callGasLimit: this.networkManager.gasSettings.callGasLimit,
      verificationGasLimit:
        this.networkManager.gasSettings.verificationGasLimit,
      preVerificationGas: this.networkManager.gasSettings.preVerificationGas,
      maxFeePerGas: this.networkManager.gasSettings.maxFeePerGas,
      maxPriorityFeePerGas:
        this.networkManager.gasSettings.maxPriorityFeePerGas,
      paymasterAndData: this.contracts.paymaster.address,
      signature: "0x",
    };
  }

  async signUserOperation(userOp, wallet) {
    const userOpHash = await this.contracts.entryPoint.getUserOpHash(userOp);
    return await wallet.signMessage(ethers.utils.arrayify(userOpHash));
  }

  async submitUserOperation(userOp, description) {
    userOp.signature = await this.signUserOperation(
      userOp,
      this.getWalletForAccount(userOp.sender)
    );

    try {
      Logger.info(`Executing: ${description}`);

      const tx = await this.contracts.entryPoint
        .connect(this.deployer)
        .handleOps([userOp], this.deployer.address, {
          gasLimit: 2000000,
          maxFeePerGas: this.networkManager.gasSettings.maxFeePerGas,
          maxPriorityFeePerGas:
            this.networkManager.gasSettings.maxPriorityFeePerGas,
        });

      const receipt = await tx.wait();

      if (!receipt || !receipt.status) {
        throw new Error("Transaction failed or was reverted");
      }

      Logger.success(`${description} completed`, {
        TransactionHash: receipt.transactionHash,
        GasUsed: receipt.gasUsed.toString(),
      });

      return receipt;
    } catch (error) {
      Logger.error(`Failed: ${description}`, error);
      throw error;
    }
  }

  getSaltForAccount(accountAddress) {
    if (accountAddress === this.smartAccounts.fieldManager) return 0;
    if (accountAddress === this.smartAccounts.beneficiary) return 1;
    return 0;
  }

  getWalletForAccount(accountAddress) {
    if (accountAddress === this.smartAccounts.fieldManager)
      return this.wallets.fieldManager;
    if (accountAddress === this.smartAccounts.beneficiary)
      return this.wallets.beneficiary;
    throw new Error(`Unknown account address: ${accountAddress}`);
  }

  recordTransaction(transaction) {
    transaction.timestamp = new Date().toISOString();
    this.transactionHistory.push(transaction);
  }

  async generateFinalReport() {
    Logger.divider("Generating Final Report");

    // Get final balances
    const finalBalances = {
      fieldManager: {
        rahat: ethers.utils.formatEther(
          await this.contracts.rahatToken.balanceOf(
            this.smartAccounts.fieldManager
          )
        ),
        cash: ethers.utils.formatEther(
          await this.contracts.cashToken.balanceOf(
            this.smartAccounts.fieldManager
          )
        ),
      },
      beneficiary: {
        rahat: ethers.utils.formatEther(
          await this.contracts.rahatToken.balanceOf(
            this.smartAccounts.beneficiary
          )
        ),
        cash: ethers.utils.formatEther(
          await this.contracts.cashToken.balanceOf(
            this.smartAccounts.beneficiary
          )
        ),
      },
    };

    const report = {
      timestamp: new Date().toISOString(),
      network: {
        name: this.networkManager.network.name,
        chainId: this.networkManager.network.chainId,
        type: this.networkManager.networkType,
      },
      contracts: {
        entryPoint: this.contracts.entryPoint.address,
        rahatToken: this.contracts.rahatToken.address,
        cashToken: this.contracts.cashToken.address,
        paymaster: this.contracts.paymaster.address,
        factory: this.contracts.factory.address,
      },
      smartAccounts: this.smartAccounts,
      finalBalances: finalBalances,
      transactionHistory: this.transactionHistory,
      flowSummary: {
        totalTransactions: this.transactionHistory.length,
        flow: "Deployer → Field Manager → Beneficiary → Cash-out Handshake",
        initialMint: CONFIG.tokenAmounts.initialMint + " RAHAT",
        assigned: CONFIG.tokenAmounts.assignAmount + " RAHAT",
        cashedOut: CONFIG.tokenAmounts.cashOutAmount + " RAHAT → CASH",
        handshakeProtocol: "approve + transferFrom + mint",
      },
      gasSettings: {
        maxFeePerGas:
          ethers.utils.formatUnits(
            this.networkManager.gasSettings.maxFeePerGas,
            "gwei"
          ) + " gwei",
        maxPriorityFeePerGas:
          ethers.utils.formatUnits(
            this.networkManager.gasSettings.maxPriorityFeePerGas,
            "gwei"
          ) + " gwei",
        paymasterFunding:
          this.networkManager.gasSettings.paymasterFunding + " ETH",
      },
    };

    const filename = `cashout-handshake-report-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));

    Logger.success("Final report generated", { File: filename });
    Logger.success("Final balances", {
      "🏢 Field Manager": `${finalBalances.fieldManager.rahat} RAHAT, ${finalBalances.fieldManager.cash} CASH`,
      "👤 Beneficiary": `${finalBalances.beneficiary.rahat} RAHAT, ${finalBalances.beneficiary.cash} CASH`,
    });
  }

  async run() {
    try {
      await this.initialize();
      await this.deployContracts();
      await this.setupSmartAccounts();
      await this.executeCompleteFlow();
      Logger.divider("Cash-Out Handshake Flow Completed Successfully");
      Logger.success("Complete cash-out handshake protocol completed!");
    } catch (error) {
      Logger.error("Flow failed", error);
      throw error;
    }
  }
}

async function main() {
  const flow = new CashOutHandshakeFlow();
  await flow.run();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { CashOutHandshakeFlow };
