# EIP-7702 Passkey Delegation Demo

This demo showcases how to use EIP-7702 to delegate an Externally Owned Account (EOA) from MetaMask to a smart contract, enabling passkey-based transaction signing.

## How It Works

### 1. **User Connects MetaMask**
   - User connects their MetaMask wallet (EOA)
   - This EOA will be delegated to a smart contract

### 2. **Create Passkey & Delegate**
   - User creates a WebAuthn credential (passkey)
   - The EOA signs an EIP-7702 authorization to delegate control to the DelegationContract
   - The authorization is submitted on-chain, establishing the delegation

### 3. **Execute Transactions with Passkey**
   - After delegation, the EOA can be controlled through the smart contract
   - User authenticates with their passkey to execute transactions
   - The delegated contract executes actions on behalf of the EOA

## Key Components

### `Delegation.sol` (in packages/contracts/src/)
The smart contract that gets delegated control of the EOA. It includes:
- `initialize()`: Sets up the delegation and emits "Hello, world!"
- `ping()`: Simple test function that emits "Pong!"

### `eip-7702-example.ts`
Core logic for:
- Creating passkeys
- Signing EIP-7702 authorizations
- Managing delegations
- Executing transactions through passkeys

### `eip-7702-hooks.ts`
React hooks for:
- Creating delegations
- Executing with passkeys
- Managing delegation state

## Deployment

1. Deploy the `Delegation.sol` contract from `packages/contracts/src/`:
   ```bash
   cd packages/contracts
   forge script script/Deploy.s.sol --rpc-url <YOUR_RPC_URL> --broadcast
   ```
2. Update `CONTRACT_ADDRESS` in `apps/web/app/7702/page.tsx` with the deployed address
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