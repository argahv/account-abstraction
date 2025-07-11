const { ethers } = require("ethers");

/**
 * Helper functions for working with VerifyingPaymaster
 */

/**
 * Create paymaster signature for sponsoring a UserOperation
 * @param {ethers.Wallet} signer - The paymaster signer wallet
 * @param {Object} userOp - The UserOperation
 * @param {string} paymasterAddress - The paymaster contract address
 * @param {number} validUntil - Timestamp until signature is valid (0 for no expiry)
 * @param {number} validAfter - Timestamp from when signature is valid
 * @param {number} chainId - The chain ID
 * @returns {string} - Encoded paymasterAndData
 */
async function createPaymasterSignature(
  signer,
  userOp,
  paymasterAddress,
  validUntil = 0,
  validAfter = 0,
  chainId
) {
  // Create the hash that the paymaster will verify
  const hash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      [
        "address", // sender
        "uint256", // nonce
        "bytes32", // initCode hash
        "bytes32", // callData hash
        "uint256", // callGasLimit
        "uint256", // verificationGasLimit
        "uint256", // preVerificationGas
        "uint256", // maxFeePerGas
        "uint256", // maxPriorityFeePerGas
        "uint256", // chainId
        "address", // paymaster
        "uint48", // validUntil
        "uint48", // validAfter
      ],
      [
        userOp.sender,
        userOp.nonce,
        ethers.utils.keccak256(userOp.initCode || "0x"),
        ethers.utils.keccak256(userOp.callData || "0x"),
        userOp.callGasLimit,
        userOp.verificationGasLimit,
        userOp.preVerificationGas,
        userOp.maxFeePerGas,
        userOp.maxPriorityFeePerGas,
        chainId,
        paymasterAddress,
        validUntil,
        validAfter,
      ]
    )
  );

  // Sign the hash
  const signature = await signer.signMessage(ethers.utils.arrayify(hash));

  // Encode paymaster data: validUntil (6 bytes) + validAfter (6 bytes) + signature (65 bytes)
  const paymasterData = ethers.utils.defaultAbiCoder.encode(
    ["uint48", "uint48", "bytes"],
    [validUntil, validAfter, signature]
  );

  // Return paymasterAddress + paymasterData
  return paymasterAddress + paymasterData.slice(2);
}

/**
 * Create a simple paymaster signature with default valid times
 * @param {ethers.Wallet} signer - The paymaster signer wallet
 * @param {Object} userOp - The UserOperation
 * @param {string} paymasterAddress - The paymaster contract address
 * @param {number} chainId - The chain ID
 * @returns {string} - Encoded paymasterAndData
 */
async function createSimplePaymasterSignature(
  signer,
  userOp,
  paymasterAddress,
  chainId
) {
  const now = Math.floor(Date.now() / 1000);
  const validAfter = now - 60; // Valid from 1 minute ago
  const validUntil = now + 3600; // Valid for 1 hour

  return createPaymasterSignature(
    signer,
    userOp,
    paymasterAddress,
    validUntil,
    validAfter,
    chainId
  );
}

/**
 * Estimate the cost of a UserOperation
 * @param {Object} userOp - The UserOperation
 * @param {ethers.providers.Provider} provider - Ethereum provider
 * @returns {ethers.BigNumber} - Estimated cost in wei
 */
function estimateUserOpCost(userOp, provider) {
  const gasLimit = ethers.BigNumber.from(userOp.callGasLimit)
    .add(userOp.verificationGasLimit)
    .add(userOp.preVerificationGas);

  const gasPrice = ethers.BigNumber.from(userOp.maxFeePerGas);

  return gasLimit.mul(gasPrice);
}

/**
 * Check if paymaster has sufficient balance to sponsor a UserOperation
 * @param {ethers.Contract} paymaster - The paymaster contract
 * @param {Object} userOp - The UserOperation
 * @param {ethers.providers.Provider} provider - Ethereum provider
 * @returns {boolean} - True if paymaster can sponsor
 */
async function canSponsorUserOp(paymaster, userOp, provider) {
  const estimatedCost = estimateUserOpCost(userOp, provider);
  const paymasterBalance = await paymaster.getBalance();

  return paymasterBalance.gte(estimatedCost);
}

module.exports = {
  createPaymasterSignature,
  createSimplePaymasterSignature,
  estimateUserOpCost,
  canSponsorUserOp,
};
