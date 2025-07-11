const { ethers } = require("ethers");

/**
 * Validate Ethereum address
 * @param {string} address - Address to validate
 * @returns {boolean} - True if valid address
 */
function isValidAddress(address) {
  return ethers.utils.isAddress(address);
}

/**
 * Format address for display (truncated)
 * @param {string} address - Address to format
 * @param {number} startChars - Number of chars to show at start (default: 6)
 * @param {number} endChars - Number of chars to show at end (default: 4)
 * @returns {string} - Formatted address
 */
function formatAddress(address, startChars = 6, endChars = 4) {
  if (!isValidAddress(address)) {
    return "Invalid Address";
  }
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Check if address is zero address
 * @param {string} address - Address to check
 * @returns {boolean} - True if zero address
 */
function isZeroAddress(address) {
  return address === ethers.constants.AddressZero;
}

/**
 * Validate all required addresses are present and valid
 * @param {Object} addresses - Object containing addresses
 * @param {Array} requiredKeys - Array of required address keys
 * @returns {Object} - Validation result
 */
function validateAddresses(addresses, requiredKeys) {
  const result = {
    valid: true,
    errors: [],
  };

  for (const key of requiredKeys) {
    if (!addresses[key]) {
      result.valid = false;
      result.errors.push(`Missing address for ${key}`);
    } else if (!isValidAddress(addresses[key])) {
      result.valid = false;
      result.errors.push(`Invalid address for ${key}: ${addresses[key]}`);
    } else if (isZeroAddress(addresses[key])) {
      result.valid = false;
      result.errors.push(`Zero address for ${key}`);
    }
  }

  return result;
}

module.exports = {
  isValidAddress,
  formatAddress,
  isZeroAddress,
  validateAddresses,
};
