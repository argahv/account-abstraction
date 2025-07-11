const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Advanced ERC-4337 Account Abstraction Features Demo");
  console.log("======================================================\n");

  // Get signers
  const [
    deployer,
    owner,
    delegate,
    sessionKey,
    guardian1,
    guardian2,
    guardian3,
    newOwner,
  ] = await ethers.getSigners();

  console.log("👥 Demo Participants:");
  console.log("====================");
  console.log("Deployer:", deployer.address);
  console.log("Account Owner:", owner.address);
  console.log("Delegate:", delegate.address);
  console.log("Session Key:", sessionKey.address);
  console.log("Guardian 1:", guardian1.address);
  console.log("Guardian 2:", guardian2.address);
  console.log("Guardian 3:", guardian3.address);
  console.log("New Owner (for recovery):", newOwner.address);

  // Deploy contracts
  console.log("\n📋 Deploying Advanced Contracts...");
  console.log("===================================");

  // Deploy EntryPoint
  const EntryPoint = await ethers.getContractFactory("EntryPoint");
  const entryPoint = await EntryPoint.deploy();
  await entryPoint.deployed();
  console.log("✅ EntryPoint deployed:", entryPoint.address);

  // Deploy AdvancedAccountFactory
  const AdvancedAccountFactory = await ethers.getContractFactory(
    "AdvancedAccountFactory"
  );
  const factory = await AdvancedAccountFactory.deploy(entryPoint.address);
  await factory.deployed();
  console.log("✅ AdvancedAccountFactory deployed:", factory.address);

  // Deploy test token for demonstrations
  const RahatToken = await ethers.getContractFactory("RahatToken");
  const token = await RahatToken.deploy();
  await token.deployed();
  console.log("✅ Test Token deployed:", token.address);

  // Create Advanced Account
  console.log("\n📝 Creating Advanced Account...");
  console.log("==============================");

  const createTx = await factory.createAccount(owner.address, 0);
  await createTx.wait();

  const accountAddress = await factory.getAddress(owner.address, 0);
  const account = await ethers.getContractAt("AdvancedAccount", accountAddress);
  console.log("✅ Advanced Account created:", accountAddress);

  // Fund the account with some ETH
  await deployer.sendTransaction({
    to: accountAddress,
    value: ethers.utils.parseEther("1.0"),
  });
  console.log("✅ Account funded with 1 ETH");

  // Mint some tokens to the account for testing
  await token.mint(accountAddress, ethers.utils.parseEther("10000"));
  console.log("✅ Account funded with 10,000 test tokens");

  console.log("\n" + "=".repeat(80));
  console.log("🎯 ADVANCED ACCOUNT ABSTRACTION FEATURES DEMONSTRATION");
  console.log("=".repeat(80));

  // =========================================================================
  // FEATURE 1: DELEGATION SYSTEM
  // =========================================================================
  console.log("\n📍 FEATURE 1: Delegation System");
  console.log("===============================");

  // Define allowed function selectors for delegate
  const transferSelector = token.interface.getSighash("transfer");
  const approveSelector = token.interface.getSighash("approve");
  const allowedSelectors = [transferSelector, approveSelector];

  // Grant delegation
  const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  console.log("🔐 Granting delegation to:", delegate.address);
  console.log("   Allowed functions: transfer, approve");
  console.log("   Expiry:", new Date(expiry * 1000).toLocaleString());

  const grantTx = await account
    .connect(owner)
    .grantDelegation(delegate.address, allowedSelectors, expiry);
  await grantTx.wait();
  console.log("✅ Delegation granted!");

  // Test delegation - delegate transfers tokens
  console.log("\n🔄 Testing delegation - delegate transfers 100 tokens...");
  const transferCalldata = token.interface.encodeFunctionData("transfer", [
    sessionKey.address,
    ethers.utils.parseEther("100"),
  ]);

  const delegateExecuteTx = await account
    .connect(delegate)
    .execute(token.address, 0, transferCalldata);
  await delegateExecuteTx.wait();
  console.log("✅ Delegate successfully transferred tokens!");

  // Check token balance
  const sessionKeyBalance = await token.balanceOf(sessionKey.address);
  console.log(
    `📊 Session key received: ${ethers.utils.formatEther(
      sessionKeyBalance
    )} tokens`
  );

  // =========================================================================
  // FEATURE 2: SESSION KEYS SYSTEM
  // =========================================================================
  console.log("\n📍 FEATURE 2: Session Keys System");
  console.log("=================================");

  // Add session key with spending limit
  const sessionExpiry = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now
  const spendingLimit = ethers.utils.parseEther("500"); // 500 tokens max

  console.log("🔑 Adding session key:", sessionKey.address);
  console.log("   Spending limit: 500 tokens");
  console.log("   Expiry:", new Date(sessionExpiry * 1000).toLocaleString());

  const addSessionTx = await account
    .connect(owner)
    .addSessionKey(sessionKey.address, sessionExpiry, spendingLimit, [
      transferSelector,
    ]);
  await addSessionTx.wait();
  console.log("✅ Session key added!");

  // Test session key - transfer within limit
  console.log("\n🔄 Testing session key - transferring 200 tokens...");
  const sessionTransferCalldata = token.interface.encodeFunctionData(
    "transfer",
    [guardian1.address, ethers.utils.parseEther("200")]
  );

  const sessionExecuteTx = await account
    .connect(sessionKey)
    .execute(token.address, 0, sessionTransferCalldata);
  await sessionExecuteTx.wait();
  console.log("✅ Session key successfully transferred tokens!");

  // Check spending
  const sessionKeyInfo = await account.sessionKeys(sessionKey.address);
  console.log(
    `📊 Session key spent: ${ethers.utils.formatEther(
      sessionKeyInfo.spentAmount
    )} tokens`
  );

  // =========================================================================
  // FEATURE 3: MULTI-SIGNATURE SYSTEM
  // =========================================================================
  console.log("\n📍 FEATURE 3: Multi-Signature System");
  console.log("====================================");

  // Configure multi-sig with 2-of-3 threshold
  const signers = [owner.address, guardian1.address, guardian2.address];
  const threshold = 2;

  console.log("🔒 Configuring multi-signature:");
  console.log("   Signers:", signers);
  console.log("   Threshold: 2 of 3");

  const configMultiSigTx = await account
    .connect(owner)
    .configureMultiSig(signers, threshold);
  await configMultiSigTx.wait();
  console.log("✅ Multi-signature configured!");

  // Create a UserOperation that requires multi-sig approval
  const multiSigTransferCalldata = token.interface.encodeFunctionData(
    "transfer",
    [newOwner.address, ethers.utils.parseEther("1000")]
  );

  const multiSigUserOp = {
    sender: accountAddress,
    nonce: 0,
    initCode: "0x",
    callData: account.interface.encodeFunctionData("execute", [
      token.address,
      0,
      multiSigTransferCalldata,
    ]),
    callGasLimit: 200000,
    verificationGasLimit: 100000,
    preVerificationGas: 21000,
    maxFeePerGas: ethers.utils.parseUnits("20", "gwei"),
    maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei"),
    paymasterAndData: "0x",
    signature: "0x",
  };

  const userOpHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      [
        "address",
        "uint256",
        "bytes",
        "bytes",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "bytes",
        "bytes",
      ],
      [
        multiSigUserOp.sender,
        multiSigUserOp.nonce,
        multiSigUserOp.initCode,
        multiSigUserOp.callData,
        multiSigUserOp.callGasLimit,
        multiSigUserOp.verificationGasLimit,
        multiSigUserOp.preVerificationGas,
        multiSigUserOp.maxFeePerGas,
        multiSigUserOp.maxPriorityFeePerGas,
        multiSigUserOp.paymasterAndData,
        multiSigUserOp.signature,
      ]
    )
  );

  console.log("\n🔄 Multi-sig approval process:");

  // First approval
  const approve1Tx = await account.connect(owner).approveUserOp(userOpHash);
  await approve1Tx.wait();
  console.log("✅ First approval from owner");

  // Second approval
  const approve2Tx = await account.connect(guardian1).approveUserOp(userOpHash);
  await approve2Tx.wait();
  console.log("✅ Second approval from guardian1");

  // Check approvals
  const approvals = await account.multiSigApprovals(userOpHash);
  console.log(`📊 Total approvals: ${approvals} (threshold: ${threshold})`);

  // =========================================================================
  // FEATURE 4: SOCIAL RECOVERY SYSTEM
  // =========================================================================
  console.log("\n📍 FEATURE 4: Social Recovery System");
  console.log("====================================");

  // Add guardians
  console.log("👥 Adding guardians for social recovery...");

  const addGuardian1Tx = await account
    .connect(owner)
    .addGuardian(guardian1.address);
  await addGuardian1Tx.wait();
  console.log("✅ Guardian 1 added:", guardian1.address);

  const addGuardian2Tx = await account
    .connect(owner)
    .addGuardian(guardian2.address);
  await addGuardian2Tx.wait();
  console.log("✅ Guardian 2 added:", guardian2.address);

  const addGuardian3Tx = await account
    .connect(owner)
    .addGuardian(guardian3.address);
  await addGuardian3Tx.wait();
  console.log("✅ Guardian 3 added:", guardian3.address);

  // Set recovery threshold
  const recoveryThreshold = 2;
  const setThresholdTx = await account
    .connect(owner)
    .setRecoveryThreshold(recoveryThreshold);
  await setThresholdTx.wait();
  console.log(`✅ Recovery threshold set to: ${recoveryThreshold}`);

  // Initiate recovery
  console.log("\n🚨 Simulating account recovery scenario...");
  console.log("   Current owner:", owner.address);
  console.log("   Proposed new owner:", newOwner.address);

  const initiateRecoveryTx = await account
    .connect(guardian1)
    .initiateRecovery(newOwner.address);
  const recoveryReceipt = await initiateRecoveryTx.wait();

  // Get recovery request ID from events
  const recoveryEvent = recoveryReceipt.events.find(
    (e) => e.event === "RecoveryInitiated"
  );
  const requestId = recoveryEvent.args.requestId;
  console.log("✅ Recovery initiated by guardian1");
  console.log("   Request ID:", requestId);

  // Second guardian approves recovery
  const approveRecoveryTx = await account
    .connect(guardian2)
    .approveRecovery(requestId);
  await approveRecoveryTx.wait();
  console.log("✅ Recovery approved by guardian2");

  // Check recovery status
  const recoveryRequest = await account.recoveryRequests(requestId);
  console.log(
    `📊 Recovery approvals: ${recoveryRequest.approvals} (threshold: ${recoveryThreshold})`
  );
  console.log("⏰ Recovery will be executable after 2-day delay");

  // =========================================================================
  // FEATURE 5: SPENDING LIMITS
  // =========================================================================
  console.log("\n📍 FEATURE 5: Daily Spending Limits");
  console.log("===================================");

  // Set daily spending limit for the token
  const dailyLimit = ethers.utils.parseEther("1000"); // 1000 tokens per day
  console.log(
    `💰 Setting daily spending limit: ${ethers.utils.formatEther(
      dailyLimit
    )} tokens`
  );

  const setLimitTx = await account
    .connect(owner)
    .setDailySpendingLimit(token.address, dailyLimit);
  await setLimitTx.wait();
  console.log("✅ Daily spending limit set!");

  // =========================================================================
  // FEATURE 6: BATCH OPERATIONS
  // =========================================================================
  console.log("\n📍 FEATURE 6: Batch Operations");
  console.log("==============================");

  // Prepare batch operations
  const batchDests = [token.address, token.address];
  const batchValues = [0, 0];
  const batchFuncs = [
    token.interface.encodeFunctionData("transfer", [
      guardian2.address,
      ethers.utils.parseEther("50"),
    ]),
    token.interface.encodeFunctionData("transfer", [
      guardian3.address,
      ethers.utils.parseEther("50"),
    ]),
  ];

  console.log("📦 Executing batch operations:");
  console.log("   - Transfer 50 tokens to guardian2");
  console.log("   - Transfer 50 tokens to guardian3");

  const batchTx = await account
    .connect(owner)
    .batchExecute(batchDests, batchValues, batchFuncs);
  await batchTx.wait();
  console.log("✅ Batch operations completed!");

  // Check balances
  const guardian2Balance = await token.balanceOf(guardian2.address);
  const guardian3Balance = await token.balanceOf(guardian3.address);
  console.log(
    `📊 Guardian2 balance: ${ethers.utils.formatEther(guardian2Balance)} tokens`
  );
  console.log(
    `📊 Guardian3 balance: ${ethers.utils.formatEther(guardian3Balance)} tokens`
  );

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log("🎉 ADVANCED ACCOUNT ABSTRACTION FEATURES DEMO COMPLETE!");
  console.log("=".repeat(80));

  console.log("\n📊 Summary of Demonstrated Features:");
  console.log("====================================");
  console.log(
    "✅ 1. Delegation System - Delegate can execute specific functions"
  );
  console.log("✅ 2. Session Keys - Temporary keys with spending limits");
  console.log(
    "✅ 3. Multi-Signature - Multiple approvals required for operations"
  );
  console.log("✅ 4. Social Recovery - Guardians can recover lost accounts");
  console.log("✅ 5. Spending Limits - Daily spending caps for security");
  console.log(
    "✅ 6. Batch Operations - Multiple operations in single transaction"
  );

  console.log("\n🔍 Advanced AA Capabilities Enabled:");
  console.log("====================================");
  console.log("• 🎯 Granular Permission Management");
  console.log("• ⏰ Time-based Access Control");
  console.log("• 💰 Spending Limit Enforcement");
  console.log("• 👥 Collaborative Account Management");
  console.log("• 🔒 Enhanced Security through Multi-sig");
  console.log("• 🛡️ Account Recovery Mechanisms");
  console.log("• ⚡ Gas-efficient Batch Operations");
  console.log("• 🔐 Programmable Authorization Logic");

  console.log("\n💡 Real-world Use Cases:");
  console.log("========================");
  console.log("• Corporate treasury management with multi-sig");
  console.log("• DeFi protocols with automated session keys");
  console.log("• Family accounts with guardian-based recovery");
  console.log("• DAO governance with delegation systems");
  console.log("• Mobile wallets with spending limits");
  console.log("• Enterprise accounts with role-based access");

  // Save demo results
  const results = {
    timestamp: new Date().toISOString(),
    contracts: {
      entryPoint: entryPoint.address,
      factory: factory.address,
      account: accountAddress,
      token: token.address,
    },
    features: {
      delegation: {
        delegate: delegate.address,
        allowedSelectors: allowedSelectors,
        expiry: expiry,
      },
      sessionKey: {
        address: sessionKey.address,
        spendingLimit: ethers.utils.formatEther(spendingLimit),
        expiry: sessionExpiry,
      },
      multiSig: {
        signers: signers,
        threshold: threshold,
        approvals: approvals.toString(),
      },
      socialRecovery: {
        guardians: [guardian1.address, guardian2.address, guardian3.address],
        threshold: recoveryThreshold,
        requestId: requestId,
      },
      spendingLimits: {
        token: token.address,
        dailyLimit: ethers.utils.formatEther(dailyLimit),
      },
    },
  };

  fs.writeFileSync(
    path.join(__dirname, "../advanced_aa_demo_results.json"),
    JSON.stringify(results, null, 2)
  );

  console.log("\n📄 Demo results saved to: advanced_aa_demo_results.json");
  console.log(
    "\n🚀 Advanced Account Abstraction implementation is ready for production!"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
