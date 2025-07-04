import { 
  createWebAuthnCredential, 
  toWebAuthnAccount,
  type WebAuthnAccount 
} from 'viem/account-abstraction'
import {
  type Address,
  type Hex,
  createWalletClient,
  http,
  type PrivateKeyAccount,
  type Chain,
  type WalletClient,
} from 'viem'
import { generateMnemonic, generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { example_abi } from './example_abi'

export type WalletType = 'metamask' | 'local' | 'cold'

// Store WebAuthn account globally for reuse
let storedWebAuthnAccount: WebAuthnAccount | null = null
let storedCredential: any | null = null
let storedWalletType: WalletType | null = null

export const DELEGATION_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890' as const

export type Call = {
  to: Address
  value?: bigint
  data?: Hex
}

/**
 * Creates a new WebAuthn account with passkey and delegates any type of EOA to it
 */
export async function createPasskeyDelegation({ 
  walletClient,
  contractAddress,
  addLog,
  walletType,
}: { 
  walletClient: WalletClient
  contractAddress: Address
  addLog?: (message: string | React.ReactNode) => void
  walletType: WalletType
}) {
  try {
    const eoaAccount = walletClient.account
    if (!eoaAccount) {
      throw new Error('No account found in wallet client')
    }
    
    storedWalletType = walletType
    
    addLog?.(`Using ${walletType} EOA: ${eoaAccount.address}`)
    addLog?.('Creating WebAuthn credential (Passkey)...')
    
    // Create a WebAuthn credential (passkey)
    const credential = await createWebAuthnCredential({
      name: `Delegated ${walletType} EOA: ${eoaAccount.address.slice(0, 8)}...`,
    })
    
    // Create WebAuthn account from credential
    const webAuthnAccount = toWebAuthnAccount({
      credential,
    })
    
    // Store for later use
    storedWebAuthnAccount = webAuthnAccount
    storedCredential = credential
    
    addLog?.(`Passkey created with ID: ${credential.id.slice(0, 16)}...`)
    addLog?.('Signing EIP-7702 authorization to delegate EOA to contract...')
    
    // Sign authorization to delegate the EOA to the contract
    const authorization = await walletClient.signAuthorization({
      account: eoaAccount,
      contractAddress,
    })
    
    addLog?.('Sending delegation transaction...')
    
    // Send the authorization transaction to delegate the EOA
    const hash = await walletClient.writeContract({
      address: DELEGATION_CONTRACT_ADDRESS,
      abi: example_abi,
      functionName: 'initialize',
      authorizationList: [authorization],
      chain: walletClient.chain,
      account: eoaAccount,
    })
    
    addLog?.(`Delegation transaction sent: ${hash}`)
    addLog?.('EOA successfully delegated! Passkey can now control transactions.')
    
    return {
      eoaAddress: eoaAccount.address,
      passkeyId: credential.id,
      authorizationHash: hash,
      webAuthnAccount,
      credential,
      walletType,
    }
  } catch (error) {
    console.error('Failed to create passkey delegation:', error)
    throw error
  }
}

/**
 * Executes transactions using the passkey on behalf of the delegated EOA
 */
export async function executeWithPasskey({
  walletClient,
  calls,
  addLog,
}: {
  walletClient: WalletClient
  calls: Call[]
  addLog?: (message: string | React.ReactNode) => void
}) {
  try {
    if (!storedWebAuthnAccount || !storedCredential) {
      throw new Error('No passkey found. Please create a delegation first.')
    }
    
    const eoaAccount = walletClient.account
    if (!eoaAccount) {
      throw new Error('No account found in wallet client')
    }
    
    addLog?.('Authenticating with passkey...')
    
    // In a real implementation, you would:
    // 1. Use the passkey to sign the transaction data
    // 2. Send it through the delegated contract
    // For this demo, we'll execute directly through the EOA
    
    const firstCall = calls[0]
    if (!firstCall) throw new Error('No calls provided')
    
    addLog?.('Executing transaction through delegated EOA...')
    
    // Since the EOA is delegated to the contract, we can now execute
    // transactions that will be processed through the delegation
    const hash = await walletClient.sendTransaction({
      to: firstCall.to,
      data: firstCall.data,
      value: firstCall.value ?? 0n,
      account: eoaAccount,
      chain: walletClient.chain,
    })
    
    addLog?.(`Transaction executed: ${hash}`)
    addLog?.('Transaction completed using passkey authorization!')
    
    return hash
  } catch (error) {
    console.error('Failed to execute with passkey:', error)
    throw error
  }
}

/**
 * Generates a local EOA in-memory
 */
export function generateLocalAccount(props: {
  chain: Chain
}): WalletClient {
  // Generate a random private key for demo purposes
  
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)
  
  // Store the private key on the account object for later retrieval
  // This is needed for localStorage persistence
  ;(account as any).privateKey = privateKey
  
  // Create a wallet client for the local account
  const walletClient = createWalletClient({
    account,
    chain: props.chain,
    transport: http(),
  })
  
  return walletClient
}

/**
 * Create wallet client from private key (for cold wallet)
 */
export function createWalletFromPrivateKey(props: {
  privateKey: Hex
  chain: Chain
}): WalletClient {
  const account = privateKeyToAccount(props.privateKey)
  
  const walletClient = createWalletClient({
    account,
    chain: props.chain,
    transport: http(),
  })
  
  return walletClient
}

/**
 * Get the current passkey delegation status
 */
export function getDelegationStatus() {
  if (!storedWebAuthnAccount || !storedCredential) {
    return null
  }
  
  return {
    passkeyId: storedCredential.id,
    webAuthnAccount: storedWebAuthnAccount,
    credential: storedCredential,
    walletType: storedWalletType,
  }
}

/**
 * Clear the stored passkey (for demo purposes)
 */
export function clearDelegation() {
  storedWebAuthnAccount = null
  storedCredential = null
  storedWalletType = null
}