const { ethers } = require("ethers");
const { getNetworkConfig, isLocalNetwork } = require("./config");

/**
 * Check if an address is a local hardhat address
 * @param {string} address - Address to check
 * @returns {boolean} - True if local hardhat address
 */
function isLocalAddress(address) {
  // Hardhat addresses typically start with 0x5FbDB, 0xe7f17, 0x9fE46, etc.
  const localPrefixes = [
    "0x5FbDB",
    "0xe7f17",
    "0x9fE46",
    "0xCf7Ed",
    "0xDc64a",
    "0xf39Fd",
    "0x70997",
    "0x3C44C",
    "0x90F79",
    "0x15d34",
    "0x9965",
    "0x976EA",
    "0x14dC7",
    "0x23618",
    "0xa0Ee7",
    "0xBcd4",
    "0x71bE6",
    "0xFABB0",
    "0x1CBd3",
    "0xdF3e1",
    "0xcd3B7",
    "0x2546B",
    "0xbDA5A",
    "0xdD2FD",
    "0xde030",
  ];

  return localPrefixes.some((prefix) => address.startsWith(prefix));
}

/**
 * Validate if deployment addresses are compatible with current network
 * @param {Object} deployments - Deployment addresses
 * @returns {Object} - Validation result
 */
function validateDeploymentAddresses(deployments) {
  const network = getNetworkConfig();
  const isLocal = isLocalNetwork();
  const result = {
    valid: true,
    warnings: [],
    errors: [],
    network: network.name,
    chainId: network.chainId,
  };

  for (const [contractName, address] of Object.entries(deployments)) {
    if (!ethers.utils.isAddress(address)) {
      result.valid = false;
      result.errors.push(`Invalid address for ${contractName}: ${address}`);
      continue;
    }

    const addressIsLocal = isLocalAddress(address);

    if (isLocal && !addressIsLocal) {
      result.warnings.push(
        `${contractName} address ${address} doesn't appear to be a local Hardhat address`
      );
    } else if (!isLocal && addressIsLocal) {
      result.valid = false;
      result.errors.push(
        `${contractName} address ${address} appears to be a local Hardhat address but you're deploying to ${network.name}`
      );
    }
  }

  return result;
}

/**
 * Validate all deployment files for current network
 * @param {string} basePath - Base directory path
 * @returns {Object} - Complete validation result
 */
function validateAllDeployments(basePath = __dirname + "/..") {
  const {
    loadCoreDeployments,
    loadAppDeployments,
    loadAccounts,
  } = require("./config");

  const validation = {
    network: getNetworkConfig(),
    core: { valid: true, warnings: [], errors: [] },
    app: { valid: true, warnings: [], errors: [] },
    accounts: { valid: true, warnings: [], errors: [] },
    overall: { valid: true, warnings: [], errors: [] },
  };

  try {
    // Validate core deployments
    const coreDeployments = loadCoreDeployments(basePath);
    validation.core = validateDeploymentAddresses(coreDeployments);
  } catch (error) {
    validation.core.valid = false;
    validation.core.errors.push(error.message);
  }

  try {
    // Validate app deployments
    const appDeployments = loadAppDeployments(basePath);
    validation.app = validateDeploymentAddresses(appDeployments);
  } catch (error) {
    validation.app.valid = false;
    validation.app.errors.push(error.message);
  }

  try {
    // Validate accounts
    const accounts = loadAccounts(basePath);
    const flatAccounts = {};
    for (const [role, addresses] of Object.entries(accounts)) {
      flatAccounts[`${role}_eoa`] = addresses.eoa;
      flatAccounts[`${role}_smartAccount`] = addresses.smartAccount;
    }
    validation.accounts = validateDeploymentAddresses(flatAccounts);
  } catch (error) {
    validation.accounts.valid = false;
    validation.accounts.errors.push(error.message);
  }

  // Overall validation
  validation.overall.valid =
    validation.core.valid && validation.app.valid && validation.accounts.valid;
  validation.overall.warnings = [
    ...validation.core.warnings,
    ...validation.app.warnings,
    ...validation.accounts.warnings,
  ];
  validation.overall.errors = [
    ...validation.core.errors,
    ...validation.app.errors,
    ...validation.accounts.errors,
  ];

  return validation;
}

/**
 * Print validation results in a readable format
 * @param {Object} validation - Validation result
 */
function printValidationResults(validation) {
  console.log(
    `\n🌐 Network Validation for ${validation.network.name} (Chain ID: ${validation.network.chainId})`
  );
  console.log("=" * 60);

  const sections = [
    { name: "Core Contracts", data: validation.core },
    { name: "App Contracts", data: validation.app },
    { name: "Accounts", data: validation.accounts },
  ];

  for (const section of sections) {
    console.log(`\n📋 ${section.name}:`);
    if (section.data.valid) {
      console.log("  ✅ Valid");
    } else {
      console.log("  ❌ Invalid");
    }

    if (section.data.warnings.length > 0) {
      console.log("  ⚠️  Warnings:");
      section.data.warnings.forEach((warning) =>
        console.log(`    - ${warning}`)
      );
    }

    if (section.data.errors.length > 0) {
      console.log("  🚨 Errors:");
      section.data.errors.forEach((error) => console.log(`    - ${error}`));
    }
  }

  console.log(
    `\n🎯 Overall Status: ${
      validation.overall.valid ? "✅ VALID" : "❌ INVALID"
    }`
  );

  if (!validation.overall.valid) {
    console.log("\n💡 To fix these issues:");
    console.log("1. Deploy contracts to the correct network");
    console.log("2. Update deployment files with correct addresses");
    console.log("3. Use accounts with funded EOAs for the target network");
  }
}

module.exports = {
  isLocalAddress,
  validateDeploymentAddresses,
  validateAllDeployments,
  printValidationResults,
};
