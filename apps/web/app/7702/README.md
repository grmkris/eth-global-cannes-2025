# EIP-7702 Passkey Delegation Demo

This demo showcases how to use EIP-7702 to delegate an Externally Owned Account (EOA) from MetaMask to a smart contract, enabling passkey-based transaction signing and token operations.

## How It Works

### 1. **User Connects Wallet**
   - User can connect MetaMask, generate a local EOA, or use a cold wallet
   - This EOA will be delegated to a smart contract

### 2. **Create Passkey & Delegate**
   - User creates a WebAuthn credential (passkey)
   - The EOA signs an EIP-7702 authorization to delegate control to the WebAuthnDelegation contract
   - The authorization is submitted on-chain, establishing the delegation with the passkey's public key

### 3. **Execute Transactions with Passkey**
   - After delegation, the EOA can be controlled through the smart contract
   - User authenticates with their passkey to execute transactions
   - The delegated contract verifies the passkey signature and executes actions on behalf of the EOA

### 4. **Token Operations (NEW)**
   - Users can mint, transfer, and approve ERC20 tokens using their passkey
   - All token operations are executed through the delegated contract
   - No need to sign with MetaMask for each transaction

## Key Components

### Smart Contracts (in packages/contracts/src/)

#### `WebAuthnDelegation.sol`
The main delegation contract that:
- Stores WebAuthn public keys
- Verifies passkey signatures using P256 cryptography
- Executes batched calls on behalf of the delegated EOA
- Includes replay protection with nonces

#### `SimpleMintableToken.sol` (NEW)
A basic ERC20 token contract with:
- Public mint function - anyone can mint tokens
- Standard ERC20 functionality (transfer, approve, transferFrom)
- `mintToSelf()` convenience function
- 18 decimals, configurable name and symbol

#### `Delegation.sol`
Simple delegation contract for testing:
- `initialize()`: Sets up the delegation and emits "Hello, world!"
- `ping()`: Simple test function that emits "Pong!"

### TypeScript Libraries

#### `eip-7702.ts`
Core logic for:
- Creating passkeys
- Signing EIP-7702 authorizations
- Managing delegations
- Executing transactions through passkeys
- **NEW**: Token operation helpers
  - `createMintCall()` - Creates call data for minting tokens
  - `createMintToSelfCall()` - Creates call data for self-minting
  - `createTransferCall()` - Creates call data for transfers
  - `createApproveCall()` - Creates call data for approvals

#### `eip-7702-hooks.ts`
React hooks for:
- Creating delegations with different wallet types
- Executing transactions with passkeys
- Managing delegation state
- **NEW**: `useExecuteTokenOperation()` - Simplified hook for token operations

## Deployment

1. Deploy the contracts from `packages/contracts/src/`:
   ```bash
   cd packages/contracts
   # Deploy WebAuthnDelegation contract
   forge script script/Deploy.s.sol --rpc-url <YOUR_RPC_URL> --broadcast
   
   # Deploy SimpleMintableToken contract (example)
   forge create SimpleMintableToken --constructor-args "MyToken" "MTK" --rpc-url <YOUR_RPC_URL> --private-key <YOUR_PRIVATE_KEY>
   ```
2. Update contract addresses in your frontend:
   - Update `CONTRACT_ADDRESS` in `apps/web/app/7702/page.tsx` with the WebAuthnDelegation address
   - Set token address when using token operations
3. Ensure your network supports EIP-7702 (check for experimental support)

## Security Considerations

- The passkey becomes a powerful credential that can control the EOA
- Store passkey credentials securely
- The delegation can be revoked by the EOA at any time
- Always verify the contract you're delegating to

## Benefits

1. **Improved UX**: No need to open MetaMask for every transaction
2. **Better Security**: Passkeys are phishing-resistant
3. **Gas Sponsorship**: Transactions can be sponsored by relayers
4. **Batch Operations**: Execute multiple operations in one transaction
5. **Token Operations**: Mint, transfer, and approve tokens using passkeys

## Example Token Operations

```typescript
// Using the useExecuteTokenOperation hook
const { mutate: executeTokenOp } = useExecuteTokenOperation({
  tokenAddress: '0x...', // Your SimpleMintableToken address
  addLog,
})

// Mint tokens to self
executeTokenOp({
  operation: 'mint',
  amount: parseEther('100'),
})

// Mint tokens to another address
executeTokenOp({
  operation: 'mint',
  amount: parseEther('50'),
  recipient: '0x...',
})

// Transfer tokens
executeTokenOp({
  operation: 'transfer',
  amount: parseEther('10'),
  recipient: '0x...',
})

// Approve spending
executeTokenOp({
  operation: 'approve',
  amount: parseEther('25'),
  spender: '0x...',
})
```