# Rahat-Cash Handshake Protocol

A complete implementation of the RahatToken to CashToken handshake protocol using ERC-4337 Account Abstraction.

## Overview

This project demonstrates a humanitarian aid distribution system where:

1. Beneficiaries receive RahatTokens (aid vouchers)
2. They convert RahatTokens to CashTokens through a smart account
3. CashTokens can be spent at local vendors

## Architecture

- **RahatToken**: ERC-20 token representing aid vouchers
- **CashToken**: ERC-20 token representing spendable cash
- **SimpleAdvancedAccount**: Smart account managing the handshake protocol
- **SimpleVerifyingPaymaster**: Handles gasless transactions

## Flow

1. **Aid Distribution**: Deployer mints RahatTokens to beneficiaries
2. **Approval**: Beneficiaries approve smart account to spend their RahatTokens
3. **Handshake**: Smart account converts RahatTokens to CashTokens
4. **Spending**: Beneficiaries spend CashTokens at vendors

## Usage

### Installation

```bash
npm install
```

### Deploy Contracts

```bash
npm run deploy
```

### Run Complete Flow

```bash
npm run flow
```

### Compile Contracts

```bash
npm run compile
```

## Key Features

- **Gasless Transactions**: Uses ERC-4337 for gasless user operations
- **Handshake Protocol**: Secure token conversion with approval/transferFrom pattern
- **Batch Support**: Can handle multiple beneficiaries in one transaction
- **Tracking**: Complete audit trail of all conversions and spending

## Contract Addresses

After deployment, contract addresses are saved in `deployment.json`:

- EntryPoint: Entry point for ERC-4337 operations
- RahatToken: Aid voucher token
- CashToken: Spendable cash token
- Paymaster: Handles gas payments
- Factory: Creates smart accounts

## User Story

1. **Aid Organization** distributes RahatTokens to beneficiaries
2. **Beneficiaries** approve smart account to convert their vouchers
3. **Smart Account** executes the handshake (RahatToken → CashToken)
4. **Beneficiaries** spend CashTokens at local vendors
5. **Vendors** receive guaranteed payments in CashTokens

This creates a complete humanitarian aid ecosystem with transparency, security, and efficiency.
