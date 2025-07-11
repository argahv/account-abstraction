const { ethers } = require("ethers");
const { SimpleAccountAPI } = require("@account-abstraction/sdk");

/**
 * Create a SimpleAccountAPI instance for a given user
 * @param {ethers.providers.Provider} provider - Ethereum provider
 * @param {string} entryPointAddress - EntryPoint contract address
 * @param {string} factoryAddress - SimpleAccountFactory contract address
 * @param {ethers.Wallet} ownerWallet - Owner's EOA wallet
 * @returns {SimpleAccountAPI} - Configured SimpleAccountAPI instance
 */
function createAccountAPI(
  provider,
  entryPointAddress,
  factoryAddress,
  ownerWallet
) {
  return new SimpleAccountAPI({
    provider,
    entryPointAddress,
    owner: ownerWallet,
    factoryAddress,
  });
}

/**
 * Build and sign a UserOperation for a contract call
 * @param {SimpleAccountAPI} accountApi - SimpleAccountAPI instance
 * @param {string} target - Target contract address
 * @param {string} data - Encoded function call data
 * @param {number} value - ETH value to send (default: 0)
 * @returns {Promise<Object>} - Signed UserOperation
 */
async function createSignedUserOp(accountApi, target, data, value = 0) {
  return await accountApi.createSignedUserOp({
    target,
    data,
    value,
  });
}

/**
 * Send a UserOperation to the bundler
 * @param {SimpleAccountAPI} accountApi - SimpleAccountAPI instance
 * @param {Object} userOp - Signed UserOperation
 * @returns {Promise<string>} - Transaction hash
 */
async function sendUserOp(accountApi, userOp) {
  return await accountApi.sendUserOpToBundler(userOp);
}

/**
 * Encode a function call for a contract
 * @param {ethers.Contract} contract - Contract instance
 * @param {string} functionName - Function name to call
 * @param {Array} args - Function arguments
 * @returns {string} - Encoded function call data
 */
function encodeFunctionCall(contract, functionName, args) {
  return contract.interface.encodeFunctionData(functionName, args);
}

/**
 * Wait for a UserOperation to be mined
 * @param {ethers.providers.Provider} provider - Ethereum provider
 * @param {string} userOpHash - UserOperation hash
 * @returns {Promise<Object>} - Transaction receipt
 */
async function waitForUserOp(provider, userOpHash) {
  // Note: This is a simplified implementation
  // In practice, you'd query the bundler or EntryPoint for the actual transaction
  return await provider.waitForTransaction(userOpHash);
}

module.exports = {
  createAccountAPI,
  createSignedUserOp,
  sendUserOp,
  encodeFunctionCall,
  waitForUserOp,
};
