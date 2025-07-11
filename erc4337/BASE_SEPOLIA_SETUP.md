# 🚀 Base Sepolia Deployment Guide

Complete guide to deploy and test the ERC-4337 Account Abstraction demo on Base Sepolia testnet.

## 📋 **Prerequisites**

### 1. **Get Testnet ETH**

- Visit [Alchemy Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia)
- Request at least **0.1 ETH** for deployment and testing
- Alternative faucets:
  - [Base Faucet](https://bridge.base.org/deposit)
  - [Coinbase Wallet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)

### 2. **Create Environment File**

```bash
# Create .env file in erc4337/ directory
touch .env
```

Add your configuration:

```env
# Your wallet private key (without 0x prefix)
DEPLOYER_PRIVATE_KEY=your_64_character_private_key_here

# Base Sepolia RPC URL
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Optional: BaseScan API key for verification
BASESCAN_API_KEY=your_basescan_api_key
```

⚠️ **Security**: Never commit your `.env` file. It's already in `.gitignore`.

## 🚀 **Deployment Steps**

### 1. **Validate Network Configuration**

```bash
cd erc4337
npx hardhat run scripts/validate_network.js --network base_sepolia
```

### 2. **Deploy Core Contracts**

```bash
npx hardhat run deploy/deploy_core.js --network base_sepolia
```

### 3. **Deploy Application Contracts**

```bash
npx hardhat run deploy/deploy_app.js --network base_sepolia
```

### 4. **Run Complete Demo**

```bash
npx hardhat run complete_demo_flow_with_paymaster.js --network base_sepolia
```

## 📊 **Expected Output**

### **Network Detection**

```
📡 Network: base-sepolia (Chain ID: 84532)
⛽ Gas settings for Base Sepolia:
   - Max Fee: 2 gwei
   - Priority Fee: 1 gwei
   - Paymaster Funding: 0.5 ETH
👤 Deployer: 0x1234...5678
💰 Balance: 0.15 ETH
✅ Sufficient balance for deployment
```

### **Contract Deployments**

- EntryPoint: Gas-optimized ERC-4337 implementation
- SimpleAdvancedAccountFactory: Account creation factory
- SimpleVerifyingPaymaster: Gas sponsorship contract
- RahatToken & CashToken: Humanitarian aid tokens
- CashOutManager: Token conversion logic

### **UserOperation Flow**

```
✅ 5 UserOperations executed successfully
⛽ Total gas costs: ~0.015 ETH (sponsored by paymaster)
🏦 Accounts deployed without users having ETH
💰 True gas abstraction achieved
```

## 🔍 **Verification**

### **Check Transactions on BaseScan**

- Visit [BaseScan Sepolia](https://sepolia.basescan.org)
- Search for your deployer address
- Verify contract interactions and UserOperation events

### **Monitor Paymaster Balance**

```bash
# Check paymaster ETH balance
npx hardhat console --network base_sepolia
```

```javascript
const paymaster = await ethers.getContractAt(
  "SimpleVerifyingPaymaster",
  "PAYMASTER_ADDRESS"
);
console.log(await ethers.provider.getBalance(paymaster.address));
```

## ⚠️ **Troubleshooting**

### **Insufficient Funds Error**

```
❌ Failed to fund paymaster: insufficient funds for intrinsic transaction cost
💡 Get testnet ETH from: https://www.alchemy.com/faucets/base-sepolia
💡 Required: 0.5 ETH + gas costs
```

**Solution**: Get more testnet ETH from faucets

### **Network Connection Issues**

```
❌ UserOperation failed: could not detect network
💡 Network may be congested, try increasing gas prices
```

**Solution**: Check RPC URL and network connectivity

### **Transaction Timeout**

```
❌ UserOperation failed: Transaction timeout after 60s
💡 Network may be congested, try increasing gas prices
```

**Solution**: Increase gas prices or retry during lower congestion

### **Contract Verification Failures**

```
❌ UserOperation failed: execution reverted
💡 Check contract logic and paymaster validation
```

**Solution**: Check paymaster balance and account authorization

## 📈 **Gas Optimization**

### **Base Sepolia Settings**

- **Max Fee**: 2 gwei (lower than mainnet)
- **Priority Fee**: 1 gwei
- **Call Gas Limit**: 1,000,000 (higher for safety)
- **Verification Gas**: 800,000
- **Paymaster Funding**: 0.5 ETH (sufficient for demo)

### **Cost Breakdown**

- Account Creation: ~0.003 ETH
- Token Transfer: ~0.001 ETH
- Token Assignment: ~0.002 ETH
- Cash Out: ~0.001 ETH
- **Total Demo Cost**: ~0.015 ETH

## 🎯 **Success Criteria**

✅ **Deployment Success**

- All contracts deployed without errors
- Paymaster funded and operational
- Account factory ready for user onboarding

✅ **Gas Abstraction Working**

- Users maintain 0 ETH throughout
- Paymaster balance decreases with each operation
- Real gas costs visible in BaseScan

✅ **Humanitarian Flow Complete**

- 10,000 RAHAT minted
- 5,000 RAHAT transferred via UserOperation
- 2,000 RAHAT assigned via UserOperation
- 1,000 RAHAT cashed out via UserOperation

## 🔗 **Useful Links**

- [Base Sepolia Explorer](https://sepolia.basescan.org)
- [Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Account Abstraction Docs](https://docs.alchemy.com/docs/account-abstraction-overview)

---

🎉 **Ready to deploy?** Follow the steps above and join the Account Abstraction revolution!
