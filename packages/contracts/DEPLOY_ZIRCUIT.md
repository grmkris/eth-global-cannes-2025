# Deploying WebAuthn Contracts to Zircuit Garfield Testnet

This guide walks you through deploying the WebAuthn delegation contracts to Zircuit Garfield Testnet.

## Network Information

- **Network Name:** Zircuit Garfield Testnet
- **RPC URL:** https://garfield-testnet.zircuit.com/
- **Chain ID:** 48898
- **Currency Symbol:** ETH
- **Block Explorer:** https://explorer.garfield-testnet.zircuit.com/

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Node.js and npm installed
- At least 0.01 ETH on Zircuit Garfield Testnet

## Step 1: Generate a Private Key

Generate a new wallet for deployment:

```bash
# Generate a new wallet
cast wallet new
```

This will output:
```
Successfully created new keypair.
Address: 0x... (your address)
Private key: 0x... (your private key)
```

**Important:** Save the private key securely! You'll need it for deployment.

## Step 2: Create Environment File

Create a `.env` file in the contracts directory:

```bash
cd packages/contracts
```

Create `.env` file:
```bash
cat > .env << EOF
# Deployment wallet private key (replace with your private key from step 1)
PRIVATE_KEY=0x...your_private_key_here...

# Zircuit Garfield Testnet RPC
ZIRCUIT_RPC_URL=https://garfield-testnet.zircuit.com/

# Chain ID for Zircuit Garfield Testnet
CHAIN_ID=48898
EOF
```

## Step 3: Check Wallet Balance

Check your wallet balance:

```bash
# Load environment variables
source .env

# Get your address
ADDRESS=$(cast wallet address $PRIVATE_KEY)
echo "Your address: $ADDRESS"

# Check balance
cast balance $ADDRESS --rpc-url $ZIRCUIT_RPC_URL
```

Convert wei to ETH:
```bash
BALANCE_WEI=$(cast balance $ADDRESS --rpc-url $ZIRCUIT_RPC_URL)
cast from-wei $BALANCE_WEI
```

## Step 4: Fund Your Wallet

If your balance is less than 0.01 ETH, you need to get test ETH:

1. **Copy your address** from the previous step
2. **Get test ETH** from one of these sources:
   - Zircuit Discord faucet (check their Discord for faucet channel)
   - Bridge from another testnet using a bridge service
   - Ask in the Zircuit community

3. **Verify funding** by running the balance check again:
   ```bash
   cast balance $ADDRESS --rpc-url $ZIRCUIT_RPC_URL
   ```

## Step 5: Configure Foundry

Add Zircuit Garfield Testnet to your `foundry.toml`:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]

[rpc_endpoints]
zircuit-garfield-testnet = "https://garfield-testnet.zircuit.com/"

# No etherscan config needed for Sourcify verification
```

## Step 6: Deploy and Verify Contracts

Deploy the FallbackP256Verifier and WebAuthnDelegation contracts:

```bash
# Make sure you're in the contracts directory
cd packages/contracts

# Load environment variables
source .env

# Deploy using forge script
forge script script/DeployWebAuthn.s.sol:DeployWebAuthnScript \
    --rpc-url $ZIRCUIT_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --slow \
    -vvv
```

### What this deploys:
1. **FallbackP256Verifier**: A fallback implementation for P256 signature verification
2. **WebAuthnDelegation**: The main contract that verifies WebAuthn signatures and executes transactions

## Step 7: Get Deployed Addresses

After successful deployment, look for the contract addresses in the output:

```
== Logs ==
FallbackP256Verifier deployed at: 0x...
WebAuthnDelegation deployed at: 0x...
```

You can also check the broadcast file:
```bash
cat broadcast/DeployWebAuthn.s.sol/48898/run-latest.json | grep -A 2 "contractAddress"
```

## Step 8: Verify Contracts on Sourcify

After deployment, verify your contracts using Sourcify for source code verification on the explorer.

### 8.1 Verify FallbackP256Verifier

```bash
# Replace with your actual deployed address from Step 7
FALLBACK_VERIFIER_ADDRESS=0xbc50C13Ee53b7Bb7Fb788cE35a1d1562E2e87edE

# Verify the contract
forge verify-contract \
    --verifier sourcify \
    $FALLBACK_VERIFIER_ADDRESS \
    src/FallbackP256Verifier.sol:FallbackP256Verifier \
    --root . \
    --chain-id 48898
```

### 8.2 Verify WebAuthnDelegation

The WebAuthnDelegation contract has constructor arguments that need to be encoded:

```bash
# Replace with your actual deployed addresses
FALLBACK_VERIFIER_ADDRESS=0x...
WEBAUTHN_DELEGATION_ADDRESS=0x...

# Encode constructor arguments: constructor(address precompile, address fallbackVerifier)
# Using address(0) for precompile as Zircuit doesn't have P256 precompile
CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address,address)" \
    0x0000000000000000000000000000000000000100 \
    $FALLBACK_VERIFIER_ADDRESS)

# Verify the contract
forge verify-contract \
    --verifier sourcify \
    $WEBAUTHN_DELEGATION_ADDRESS \
    src/WebAuthnDelegation.sol:WebAuthnDelegation \
    --root . \
    --chain-id 48898 \
    --constructor-args $CONSTRUCTOR_ARGS
```

### 8.3 Verification Success

Once verified, you'll see:
- "Contract source code verified" badge on the explorer
- Source code visible at: https://explorer.garfield-testnet.zircuit.com/address/YOUR_CONTRACT_ADDRESS

## Step 9: Update Frontend

Update your frontend configuration with the deployed contract address:

```typescript
// In your frontend code (apps/web/app/7702/page.tsx)
const CONTRACT_ADDRESS = '0x...your_deployed_WebAuthnDelegation_address...' as const
```

## Troubleshooting

### "Insufficient funds" error
- Make sure you have at least 0.01 ETH in your wallet
- Check that you're using the correct private key

### "Nonce too high" error
- Reset your account nonce:
  ```bash
  cast nonce $ADDRESS --rpc-url $ZIRCUIT_RPC_URL
  ```

### "Contract size exceeds limit" error
- Enable optimizer in foundry.toml:
  ```toml
  optimizer = true
  optimizer_runs = 200
  ```

### Connection issues
- Try alternative RPC endpoints if available
- Check if the network is operational

## Additional Commands

### Interact with deployed contract

Check if contract is initialized:
```bash
cast call <WEBAUTHN_DELEGATION_ADDRESS> "isInitialized()" --rpc-url $ZIRCUIT_RPC_URL
```

Get stored public key:
```bash
cast call <WEBAUTHN_DELEGATION_ADDRESS> "getPublicKey()" --rpc-url $ZIRCUIT_RPC_URL
```

### Send ETH to contract (if needed for gas):
```bash
cast send <WEBAUTHN_DELEGATION_ADDRESS> --value 0.01ether --private-key $PRIVATE_KEY --rpc-url $ZIRCUIT_RPC_URL
```

### Deployed transactions and hashes:
- https://explorer.garfield-testnet.zircuit.com/address/0xAC81d3F716F27Bec64384000a80A0106e989707A verifier with p256 support