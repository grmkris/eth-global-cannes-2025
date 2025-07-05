# Deploying WebAuthn Contracts to Zircuit Garfield Testnet & Ethereum Sepolia

This guide walks you through deploying the WebAuthn delegation contracts to Zircuit Garfield Testnet and Ethereum Sepolia.

## Network Information

### Zircuit Garfield Testnet
- **Network Name:** Zircuit Garfield Testnet
- **RPC URL:** https://garfield-testnet.zircuit.com/
- **Chain ID:** 48898
- **Currency Symbol:** ETH
- **Block Explorer:** https://explorer.garfield-testnet.zircuit.com/

### Ethereum Sepolia
- **Network Name:** Ethereum Sepolia
- **RPC URL:** https://rpc.sepolia.org/ (or use Infura/Alchemy)
- **Chain ID:** 11155111
- **Currency Symbol:** ETH
- **Block Explorer:** https://sepolia.etherscan.io/

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

# Ethereum Sepolia RPC (you can use public RPC or your own Infura/Alchemy endpoint)
SEPOLIA_RPC_URL=https://rpc.sepolia.org/

# Etherscan API key for contract verification (get from https://etherscan.io/apis)
ETHERSCAN_API_KEY=your_etherscan_api_key_here
EOF
```

## Step 3: Check Wallet Balance

Check your wallet balance on both networks:

```bash
# Load environment variables
source .env

# Get your address
ADDRESS=$(cast wallet address $PRIVATE_KEY)
echo "Your address: $ADDRESS"

# Check balance on Zircuit
echo "Zircuit Garfield balance:"
cast balance $ADDRESS --rpc-url $ZIRCUIT_RPC_URL

# Check balance on Sepolia
echo "Ethereum Sepolia balance:"
cast balance $ADDRESS --rpc-url $SEPOLIA_RPC_URL
```

Convert wei to ETH:
```bash
# For Zircuit
BALANCE_WEI=$(cast balance $ADDRESS --rpc-url $ZIRCUIT_RPC_URL)
echo "Zircuit balance: $(cast from-wei $BALANCE_WEI) ETH"

# For Sepolia
BALANCE_WEI=$(cast balance $ADDRESS --rpc-url $SEPOLIA_RPC_URL)
echo "Sepolia balance: $(cast from-wei $BALANCE_WEI) ETH"
```

## Step 4: Fund Your Wallet

If your balance is less than 0.01 ETH on either network, you need to get test ETH:

### For Zircuit Garfield Testnet:
1. **Copy your address** from the previous step
2. **Get test ETH** from:
   - Zircuit Discord faucet (check their Discord for faucet channel)
   - Bridge from another testnet using a bridge service
   - Ask in the Zircuit community

### For Ethereum Sepolia:
1. **Copy your address** from the previous step
2. **Get test ETH** from:
   - [Sepolia Faucet by Alchemy](https://sepoliafaucet.com/)
   - [Chainlink Sepolia Faucet](https://faucets.chain.link/sepolia)
   - [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)

3. **Verify funding** by running the balance check again:
   ```bash
   # Check Zircuit
   cast balance $ADDRESS --rpc-url $ZIRCUIT_RPC_URL
   
   # Check Sepolia
   cast balance $ADDRESS --rpc-url $SEPOLIA_RPC_URL
   ```

## Step 5: Configure Foundry

Add both networks to your `foundry.toml`:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]

[rpc_endpoints]
zircuit-garfield-testnet = "https://garfield-testnet.zircuit.com/"
sepolia = "${SEPOLIA_RPC_URL}"

[etherscan]
sepolia = { key = "${ETHERSCAN_API_KEY}" }
```

## Step 6: Deploy and Verify Contracts

### Deploy to Zircuit Garfield Testnet

```bash
# Make sure you're in the contracts directory
cd packages/contracts

# Load environment variables
source .env

# Deploy to Zircuit
forge script script/DeployWebAuthn.s.sol:DeployWebAuthnScript \
    --rpc-url $ZIRCUIT_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --slow \
    -vvv
```

### Deploy to Ethereum Sepolia

```bash
# Deploy to Sepolia
forge script script/DeployWebAuthn.s.sol:DeployWebAuthnScript \
    --rpc-url $SEPOLIA_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --slow \
    -vvv
```

### Deploy SimpleMintableToken (Optional)

Deploy the ERC20 token contract to either network:

```bash
# Deploy to Zircuit
forge create SimpleMintableToken \
    --constructor-args "MyToken" "MTK" \
    --rpc-url $ZIRCUIT_RPC_URL \
    --private-key $PRIVATE_KEY

# Deploy to Sepolia
forge create SimpleMintableToken \
    --constructor-args "MyToken" "MTK" \
    --rpc-url $SEPOLIA_RPC_URL \
    --private-key $PRIVATE_KEY
```

### What this deploys:
1. **FallbackP256Verifier**: A fallback implementation for P256 signature verification
2. **WebAuthnDelegation**: The main contract that verifies WebAuthn signatures and executes transactions
3. **SimpleMintableToken** (optional): An ERC20 token that anyone can mint

## Step 7: Get Deployed Addresses

After successful deployment, look for the contract addresses in the output:

```
== Logs ==
FallbackP256Verifier deployed at: 0x...
WebAuthnDelegation deployed at: 0x...
```

You can also check the broadcast files:
```bash
# For Zircuit deployment
cat broadcast/DeployWebAuthn.s.sol/48898/run-latest.json | grep -A 2 "contractAddress"

# For Sepolia deployment
cat broadcast/DeployWebAuthn.s.sol/11155111/run-latest.json | grep -A 2 "contractAddress"
```

## Step 8: Verify Contracts

### 8.1 Verify on Zircuit (Sourcify)

#### Verify FallbackP256Verifier
```bash
# Replace with your actual deployed address from Step 7
FALLBACK_VERIFIER_ADDRESS=0x...

# Verify the contract
forge verify-contract \
    --verifier sourcify \
    $FALLBACK_VERIFIER_ADDRESS \
    src/FallbackP256Verifier.sol:FallbackP256Verifier \
    --root . \
    --chain-id 48898
```

#### Verify WebAuthnDelegation
```bash
# Replace with your actual deployed addresses
FALLBACK_VERIFIER_ADDRESS=0x...
WEBAUTHN_DELEGATION_ADDRESS=0x...

# Encode constructor arguments
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

### 8.2 Verify on Sepolia (Etherscan)

#### Verify FallbackP256Verifier
```bash
# Replace with your actual deployed address
FALLBACK_VERIFIER_ADDRESS_SEPOLIA=0x...

# Verify on Etherscan
forge verify-contract \
    --verifier etherscan \
    --verifier-url https://api-sepolia.etherscan.io/api \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    $FALLBACK_VERIFIER_ADDRESS_SEPOLIA \
    src/FallbackP256Verifier.sol:FallbackP256Verifier \
    --chain-id 11155111
```

#### Verify WebAuthnDelegation
```bash
# Replace with your actual deployed addresses
FALLBACK_VERIFIER_ADDRESS_SEPOLIA=0x...
WEBAUTHN_DELEGATION_ADDRESS_SEPOLIA=0x...

# Encode constructor arguments
CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address,address)" \
    0x0000000000000000000000000000000000000100 \
    $FALLBACK_VERIFIER_ADDRESS_SEPOLIA)

# Verify on Etherscan
forge verify-contract \
    --verifier etherscan \
    --verifier-url https://api-sepolia.etherscan.io/api \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    $WEBAUTHN_DELEGATION_ADDRESS_SEPOLIA \
    src/WebAuthnDelegation.sol:WebAuthnDelegation \
    --chain-id 11155111 \
    --constructor-args $CONSTRUCTOR_ARGS
```

#### Verify SimpleMintableToken (if deployed)
```bash
# Replace with your actual deployed address
TOKEN_ADDRESS_SEPOLIA=0x...

# Encode constructor arguments
CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(string,string)" "MyToken" "MTK")

# Verify on Etherscan
forge verify-contract \
    --verifier etherscan \
    --verifier-url https://api-sepolia.etherscan.io/api \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    $TOKEN_ADDRESS_SEPOLIA \
    src/SimpleMintableToken.sol:SimpleMintableToken \
    --chain-id 11155111 \
    --constructor-args $CONSTRUCTOR_ARGS
```

### 8.3 Verification Success

Once verified:
- **Zircuit**: Source code visible at https://explorer.garfield-testnet.zircuit.com/address/YOUR_CONTRACT_ADDRESS
- **Sepolia**: Source code visible at https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS

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

### Deployed Contracts

#### Zircuit Garfield Testnet:
- FallbackP256Verifier: https://explorer.garfield-testnet.zircuit.com/address/0xAC81d3F716F27Bec64384000a80A0106e989707A

#### Ethereum Sepolia:
- Check your deployment logs for addresses

## Network-Specific Notes

### Zircuit Garfield Testnet
- Uses Sourcify for contract verification
- No native P256 precompile (uses fallback verifier)
- Lower gas costs compared to mainnet

### Ethereum Sepolia
- Uses Etherscan for contract verification
- Requires Etherscan API key
- More established testnet with better tooling support
- Higher gas costs compared to Zircuit