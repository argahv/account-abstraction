const fs = require("fs");
const path = require("path");
require("dotenv").config();

/**
 * Load core contract addresses
 * @param {string} basePath - Base directory path
 * @returns {Object} - Core contract addresses
 */
function loadCoreDeployments(basePath = __dirname + "/..") {
  const filePath = path.join(basePath, "core_deployments.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(
      "core_deployments.json not found. Please deploy core contracts first."
    );
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * Load app contract addresses
 * @param {string} basePath - Base directory path
 * @returns {Object} - App contract addresses
 */
function loadAppDeployments(basePath = __dirname + "/..") {
  const filePath = path.join(basePath, "deployments.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(
      "deployments.json not found. Please deploy app contracts first."
    );
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * Load SimpleAccount addresses
 * @param {string} basePath - Base directory path
 * @returns {Object} - SimpleAccount addresses
 */
function loadAccounts(basePath = __dirname + "/..") {
  const filePath = path.join(basePath, "accounts.json");
  if (!fs.existsSync(filePath)) {
    throw new Error("accounts.json not found. Please create accounts first.");
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * Get network configuration based on environment
 * @returns {Object} - Network configuration
 */
function getNetworkConfig() {
  const chainId = process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : 84532;
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

  // Network configurations
  const networks = {
    31337: {
      name: "hardhat",
      rpcUrl: "http://localhost:8545",
      chainId: 31337,
      isLocal: true,
    },
    84532: {
      name: "base_sepolia",
      rpcUrl: rpcUrl,
      chainId: 84532,
      isLocal: false,
    },
  };

  return networks[chainId] || networks[84532]; // Default to Base Sepolia
}

/**
 * Check if we're on a local network
 * @returns {boolean} - True if on local network
 */
function isLocalNetwork() {
  return getNetworkConfig().isLocal;
}

/**
 * Load all configurations
 * @param {string} basePath - Base directory path
 * @returns {Object} - All configurations
 */
function loadAllConfig(basePath = __dirname + "/..") {
  return {
    core: loadCoreDeployments(basePath),
    deployments: loadAppDeployments(basePath),
    accounts: loadAccounts(basePath),
    network: getNetworkConfig(),
  };
}

module.exports = {
  loadCoreDeployments,
  loadAppDeployments,
  loadAccounts,
  getNetworkConfig,
  isLocalNetwork,
  loadAllConfig,
};
