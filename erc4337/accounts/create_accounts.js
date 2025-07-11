const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Load core deployments
  const core = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../core_deployments.json"))
  );
  const factoryAddress = core.SimpleAccountFactory;
  const factory = await ethers.getContractAt(
    "SimpleAccountFactory",
    factoryAddress
  );

  // Example: Use three EOAs for Donor, Field Office, Beneficiary
  const [donor, fieldOffice, beneficiary] = await ethers.getSigners();

  console.log("Creating SimpleAccounts...");
  console.log("Donor EOA:", donor.address);
  console.log("Field Office EOA:", fieldOffice.address);
  console.log("Beneficiary EOA:", beneficiary.address);

  // Deploy SimpleAccounts for each
  console.log("\n📝 Creating Donor SimpleAccount...");
  const donorTx = await factory.createAccount(donor.address, 0);
  const donorReceipt = await donorTx.wait();

  // Get the account address from the transaction logs
  const donorAccountInterface = new ethers.utils.Interface([
    "event SimpleAccountInitialized(address indexed entryPoint, address indexed owner)",
  ]);

  let donorAccount = null;
  for (const log of donorReceipt.logs) {
    try {
      const parsed = donorAccountInterface.parseLog(log);
      if (parsed.name === "SimpleAccountInitialized") {
        donorAccount = log.address;
        break;
      }
    } catch (e) {
      // Not the event we're looking for
    }
  }

  if (!donorAccount) {
    // Fallback: calculate the address manually
    donorAccount = ethers.utils.getCreate2Address(
      factoryAddress,
      ethers.utils.hexZeroPad(ethers.utils.hexlify(0), 32),
      ethers.utils.keccak256(
        ethers.utils.concat([
          (await ethers.getContractFactory("SimpleAccount")).bytecode,
          ethers.utils.defaultAbiCoder.encode(["address"], [core.EntryPoint]),
        ])
      )
    );
  }
  console.log("✅ Donor SimpleAccount:", donorAccount);

  console.log("\n📝 Creating Field Office SimpleAccount...");
  const fieldOfficeTx = await factory.createAccount(fieldOffice.address, 1);
  const fieldOfficeReceipt = await fieldOfficeTx.wait();

  let fieldOfficeAccount = null;
  for (const log of fieldOfficeReceipt.logs) {
    try {
      const parsed = donorAccountInterface.parseLog(log);
      if (parsed.name === "SimpleAccountInitialized") {
        fieldOfficeAccount = log.address;
        break;
      }
    } catch (e) {
      // Not the event we're looking for
    }
  }

  if (!fieldOfficeAccount) {
    fieldOfficeAccount = ethers.utils.getCreate2Address(
      factoryAddress,
      ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32),
      ethers.utils.keccak256(
        ethers.utils.concat([
          (await ethers.getContractFactory("SimpleAccount")).bytecode,
          ethers.utils.defaultAbiCoder.encode(["address"], [core.EntryPoint]),
        ])
      )
    );
  }
  console.log("✅ Field Office SimpleAccount:", fieldOfficeAccount);

  console.log("\n📝 Creating Beneficiary SimpleAccount...");
  const beneficiaryTx = await factory.createAccount(beneficiary.address, 2);
  const beneficiaryReceipt = await beneficiaryTx.wait();

  let beneficiaryAccount = null;
  for (const log of beneficiaryReceipt.logs) {
    try {
      const parsed = donorAccountInterface.parseLog(log);
      if (parsed.name === "SimpleAccountInitialized") {
        beneficiaryAccount = log.address;
        break;
      }
    } catch (e) {
      // Not the event we're looking for
    }
  }

  if (!beneficiaryAccount) {
    beneficiaryAccount = ethers.utils.getCreate2Address(
      factoryAddress,
      ethers.utils.hexZeroPad(ethers.utils.hexlify(2), 32),
      ethers.utils.keccak256(
        ethers.utils.concat([
          (await ethers.getContractFactory("SimpleAccount")).bytecode,
          ethers.utils.defaultAbiCoder.encode(["address"], [core.EntryPoint]),
        ])
      )
    );
  }
  console.log("✅ Beneficiary SimpleAccount:", beneficiaryAccount);

  // Save to accounts.json
  const accounts = {
    donor: {
      eoa: donor.address,
      smartAccount: donorAccount,
    },
    fieldOffice: {
      eoa: fieldOffice.address,
      smartAccount: fieldOfficeAccount,
    },
    beneficiary: {
      eoa: beneficiary.address,
      smartAccount: beneficiaryAccount,
    },
  };

  fs.writeFileSync(
    path.join(__dirname, "../accounts.json"),
    JSON.stringify(accounts, null, 2)
  );
  console.log("\n💾 Account addresses saved to accounts.json");
  console.log("\n🎉 All SimpleAccounts created successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
