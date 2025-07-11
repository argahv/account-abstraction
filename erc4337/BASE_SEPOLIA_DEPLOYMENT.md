# Base Sepolia Deployment Guide

## 🚨 Current Issue: Static Data Problem

Your ERC-4337 Account Abstraction system is **currently configured with hardcoded local addresses** that won't work on Base Sepolia. All deployment files contain local Hardhat addresses.

## 📋 Static Data Issues Found:

### 1. **Core Contract Addresses** (in `core_deployments.json`)

- EntryPoint: `0x5FbDB2315678afecb367f032d93F642f64180aa3` ❌ (Local Hardhat)
- SimpleAccountFactory: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` ❌ (Local Hardhat)

### 2. **App Contract Addresses** (in `deployments.json`)

- RahatToken: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` ❌ (Local Hardhat)
- CashToken: `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` ❌ (Local Hardhat)
- CashOutManager: `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` ❌ (Local Hardhat)

### 3. **Account Addresses** (in `accounts.json`)

- All EOA addresses are from local Hardhat accounts ❌
- All smart account addresses are computed from local contracts ❌

## 🔧 Solution: Deploy to Base Sepolia

### Step 1: Generate Real Accounts

```bash
node scripts/generate_accounts.js
```

This will:

- Generate new EOA accounts for Base Sepolia
- Create `base_sepolia.env` with private keys
- Save addresses to `base_sepolia_accounts.json`

### Step 2: Fund Your Accounts

Fund the generated accounts with Base Sepolia ETH:

- **Base Sepolia Faucet**: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- **Alchemy Faucet**: https://sepoliafaucet.com/

Recommended amounts:

- Donor: 0.01 ETH
- Field Office: 0.005 ETH
- Beneficiary: 0.005 ETH

### Step 3: Configure Environment

```bash
cp base_sepolia.env .env
```

### Step 4: Validate Network Setup

```bash
node scripts/validate_network.js
```

### Step 5: Deploy to Base Sepolia

```bash
npx hardhat run deploy_to_base_sepolia.js --network base_sepolia
```

This will deploy:

- ✅ EntryPoint contract
- ✅ AdvancedAccountFactory contract
- ✅ RahatToken contract
- ✅ CashToken contract
- ✅ CashOutManager contract
- ✅ TokenPaymaster contract
- ✅ Test AdvancedAccount

### Step 6: Update Configuration Files

After deployment, update your configuration files to use Base Sepolia addresses:

```bash
# Replace local files with Base Sepolia versions
cp base_sepolia_core_deployments.json core_deployments.json
cp base_sepolia_app_deployments.json deployments.json
cp base_sepolia_accounts.json accounts.json
```

## 🔍 Verification Commands

### Check Network Configuration

```bash
node scripts/validate_network.js
```

### Test Complete Flow

```bash
node test_complete_flow.js
```

### Test Advanced Features

```bash
node advanced_aa_demo.js
```

## 📊 Expected Base Sepolia Addresses

After deployment, your addresses will look like:

```json
{
  "EntryPoint": "0x742d35Cc6634C0532925a3b8D6Ac6c2C4e67c8d8",
  "AdvancedAccountFactory": "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
  "RahatToken": "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
  "CashToken": "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
  "CashOutManager": "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0"
}
```

## 🚀 Features That Will Work on Base Sepolia

### Basic Account Abstraction

- ✅ Smart contract wallets (SimpleAccount & AdvancedAccount)
- ✅ UserOperation execution via EntryPoint
- ✅ Gas abstraction with paymaster
- ✅ Account factories for CREATE2 deployment

### Application Logic

- ✅ RahatToken minting and transfers
- ✅ CashToken distribution
- ✅ CashOut management
- ✅ Three-party fund flow (Donor → Field Office → Beneficiary)

### Advanced Features

- ✅ **Delegation System**: Granular permissions with time limits
- ✅ **Session Keys**: Temporary access with spending limits
- ✅ **Multi-Signature**: M-of-N approval requirements
- ✅ **Social Recovery**: Guardian-based account recovery
- ✅ **Spending Limits**: Daily/weekly caps per token
- ✅ **Batch Operations**: Atomic multi-transaction execution

## 🔐 Security Considerations

### Private Key Management

- Never commit private keys to git
- Use separate accounts for different environments
- Keep test amounts small (< 0.1 ETH)

### Network Validation

- Always run `validate_network.js` before operations
- Verify contract addresses match expected network
- Check account balances before transactions

### Gas Optimization

- Use appropriate gas limits for Base Sepolia
- Monitor gas prices and adjust accordingly
- Consider using paymaster for user gas abstraction

## 📈 Monitoring & Debugging

### Block Explorer

- **Base Sepolia Explorer**: https://sepolia.basescan.org/
- Verify contract deployments
- Monitor transaction status
- Check account balances

### Logs and Events

- All contracts emit detailed events
- Use `getLogs()` to track operations
- Monitor UserOperation execution

## 🎯 Next Steps After Deployment

1. **Test Basic Flow**: Run complete fund flow test
2. **Test Advanced Features**: Verify delegation, session keys, etc.
3. **Performance Testing**: Test with multiple concurrent operations
4. **Integration**: Connect to your frontend application
5. **Monitoring**: Set up alerts for failed operations

## 🆘 Troubleshooting

### Common Issues

**"Invalid address" errors**

- Run `validate_network.js` to check configuration
- Ensure you're using Base Sepolia addresses

**"Insufficient funds" errors**

- Check account balances with Base Sepolia ETH
- Fund accounts from faucets

**"Transaction reverted" errors**

- Check contract interactions are valid
- Verify account permissions and approvals

**Gas estimation failures**

- Ensure contracts are deployed correctly
- Check network connectivity

### Getting Help

- Check contract events for detailed error information
- Use Base Sepolia block explorer for transaction details
- Verify all prerequisites are met before operations
