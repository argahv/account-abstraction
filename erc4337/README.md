# ERC-4337 Account Abstraction Project

This directory contains a complete implementation of the fund flow using ERC-4337 (Account Abstraction) with SimpleAccount smart wallets and UserOperation flows.

## Overview

This project demonstrates how to use ERC-4337 Account Abstraction for a multi-stakeholder fund management system where:

- **Donor** mints and transfers RahatToken to Field Office via SimpleAccount
- **Field Office** assigns RahatToken to Beneficiary via SimpleAccount
- **Beneficiary** cashes out RahatToken for CashToken via SimpleAccount

All actions are performed using UserOperations sent through the EntryPoint contract, not direct EOA transactions.

## Project Structure

```
erc4337/
├── contracts/           # Smart contracts
│   ├── EntryPoint.sol          # ERC-4337 EntryPoint contract
│   ├── SimpleAccount.sol       # ERC-4337 smart wallet
│   ├── SimpleAccountFactory.sol # Factory for creating SimpleAccounts
│   ├── RahatToken.sol          # Project token contract
│   ├── CashToken.sol           # Cash-out token contract
│   └── CashOutManager.sol      # Fund management logic
├── deploy/              # Deployment scripts
│   ├── deploy_core.js          # Deploy ERC-4337 core contracts
│   └── deploy_app.js           # Deploy app contracts
├── accounts/            # Account management
│   └── create_accounts.js      # Create SimpleAccounts for each actor
├── scripts/             # UserOperation scripts
│   ├── mint_and_transfer_aa.js # Donor mints and transfers tokens
│   ├── assign_aa.js            # Field Office assigns tokens
│   └── cashout_aa.js           # Beneficiary cashes out
├── sdk/                 # Helper SDK
│   └── userop_helpers.js       # UserOperation utilities
├── utils/               # Utility scripts
│   ├── config.js               # Configuration loading
│   └── addresses.js            # Address validation
└── README.md            # This file
```

## Prerequisites

1. **Install Dependencies**

   ```bash
   npm install @account-abstraction/sdk
   ```

2. **Environment Setup**
   - Ensure `.env` file contains `DEPLOYER_PRIVATE_KEY`
   - Make sure the deployer account has Base Sepolia ETH for gas

## Usage Flow

### Step 1: Deploy Core Contracts

Deploy EntryPoint and SimpleAccountFactory:

```bash
npx hardhat run erc4337/deploy/deploy_core.js --network base_sepolia
```

- Creates `erc4337/core_deployments.json` with contract addresses

### Step 2: Deploy App Contracts

Deploy RahatToken, CashToken, and CashOutManager:

```bash
npx hardhat run erc4337/deploy/deploy_app.js --network base_sepolia
```

- Creates `erc4337/deployments.json` with contract addresses

### Step 3: Create SimpleAccounts

Create smart contract wallets for each actor:

```bash
npx hardhat run erc4337/accounts/create_accounts.js --network base_sepolia
```

- Creates `erc4337/accounts.json` with SimpleAccount addresses

### Step 4: Run the Fund Flow

#### 4a. Donor Mints and Transfers

```bash
npx hardhat run erc4337/scripts/mint_and_transfer_aa.js --network base_sepolia
```

- Donor's SimpleAccount mints 1000 RahatToken
- Transfers 500 RahatToken to Field Office's SimpleAccount
- Creates `erc4337/mint_and_transfer_aa.json` with transaction info

#### 4b. Field Office Assigns Tokens

```bash
npx hardhat run erc4337/scripts/assign_aa.js --network base_sepolia
```

- Field Office's SimpleAccount assigns 200 RahatToken to Beneficiary
- Creates `erc4337/assign_aa.json` with transaction info

#### 4c. Beneficiary Cashes Out

```bash
npx hardhat run erc4337/scripts/cashout_aa.js --network base_sepolia
```

- Beneficiary's SimpleAccount cashes out 200 RahatToken for 200 CashToken
- Creates `erc4337/cashout_aa.json` with transaction info

## Key Components

### ERC-4337 Architecture

- **EntryPoint**: Validates and executes UserOperations
- **SimpleAccount**: Smart contract wallet for each actor
- **SimpleAccountFactory**: Creates new SimpleAccount instances
- **UserOperations**: Pseudo-transactions that package user intent

### Application Logic

- **RahatToken**: ERC-20 token for project funds
- **CashToken**: ERC-20 token representing cash value
- **CashOutManager**: Handles assignment and cash-out logic

### SDK Helpers

- **userop_helpers.js**: Functions for building, signing, and sending UserOperations
- **config.js**: Configuration and address loading utilities
- **addresses.js**: Address validation and formatting utilities

## Generated Files

During execution, the following files are created:

- `core_deployments.json` - Core contract addresses
- `deployments.json` - App contract addresses
- `accounts.json` - SimpleAccount addresses
- `mint_and_transfer_aa.json` - Mint/transfer transaction info
- `assign_aa.json` - Assignment transaction info
- `cashout_aa.json` - Cashout transaction info

## Benefits of ERC-4337

- **Account Abstraction**: Users interact via smart contract wallets, not EOAs
- **Flexible Gas Payment**: Can use paymasters for sponsored gas or token gas
- **Programmable Logic**: Smart wallets can enforce custom rules and permissions
- **Better UX**: Meta-transactions, batching, social recovery, etc.
- **Auditability**: All actions are traceable through UserOperations

## Notes

- All scripts use the same EOA private key for demo purposes
- In production, each actor would have their own private key
- The scripts include proper logging and save transaction hashes for auditability
- All UserOperations are sent via the @account-abstraction/sdk

## Troubleshooting

1. **Missing deployment files**: Run deployment scripts in order
2. **Invalid addresses**: Check that all contracts deployed successfully
3. **Gas issues**: Ensure deployer account has sufficient Base Sepolia ETH
4. **UserOperation failures**: Check bundler connectivity and gas estimation

For more information on ERC-4337, see: https://www.erc4337.io/docs
