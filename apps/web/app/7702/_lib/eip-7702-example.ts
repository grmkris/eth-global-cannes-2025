import { 
  createWebAuthnCredential, 
  toWebAuthnAccount,
  ,
  type WebAuthnAccount 
} from 'viem/account-abstraction'
import {
  type Address,
  type Hex,
  encodeFunctionData,
} from 'viem'
import {
  signAuthorization,
  type Authorization,
} from 'viem/experimental'
import {
  type WalletClient,
  type PublicClient,
  type Chain,
} from 'viem'
import { example_abi } from './example_abi'

// Store the WebAuthn account and credential
let webAuthnAccount: WebAuthnAccount | null = null
let storedCredential: any | null = null

export type Account = {
  address: Address
  authorizationHash?: Hex
  webAuthnAccount: WebAuthnAccount
  credential: any
}

export type Calls = { 
  to: Address
  value?: bigint
  data?: Hex
}[]

/**
 * Creates a new WebAuthn account with passkey and authorizes it for EIP-7702
 */
export async function createAccount({ 
  eoaWalletClient,
  publicClient,
  contractAddress,
  addLog,
  chain
}: { 
  eoaWalletClient: WalletClient
  publicClient: PublicClient
  contractAddress: Address
  chain: Chain
  addLog?: (message: string | React.ReactNode) => void
}) {
  try {
    addLog?.('Creating WebAuthn credential (Passkey)...')
    
    // Create a WebAuthn credential (passkey)
    const credential = await createWebAuthnCredential({
      name: `EIP-7702 Account ${eoaWalletClient.account}`,
    })
    
    // Create WebAuthn account from credential
    const account = toWebAuthnAccount({
      credential,
    })
    
    webAuthnAccount = account
    storedCredential = credential
    
      addLog?.(`WebAuthn account created: ${account.publicKey}`)
      
    // Get the relay account from wallet client (MetaMask)
    const relayAccount = eoaWalletClient.account
    if (!relayAccount) {
      throw new Error('No account connected to wallet')
    }
    
    addLog?.('Signing EIP-7702 authorization...')
    
    // Sign authorization to delegate the WebAuthn account to the contract
    const authorization = await eoaWalletClient.signAuthorization({
      account: account.publicKey,
      contractAddress,
    })
    
    addLog?.('Deploying delegation contract to WebAuthn account...')
    
    // Initialize the delegation by calling a function on the contract
    // This will deploy the contract code to the WebAuthn account address
    const hash = await eoaWalletClient.writeContract({
      address: contractAddress,
      abi: example_abi,
      functionName: 'initialize',
      authorizationList: [authorization],
      chain,
      account: account.publicKey,
    })
    
    addLog?.(`Authorization transaction sent: ${hash}`)
    
    return {
      address: account.publicKey,
      authorizationHash: hash,
      webAuthnAccount: account,
      credential,
    }
  } catch (error) {
    console.error('Failed to create account:', error)
    throw error
  }
}

/**
 * Executes transactions using the WebAuthn account
 */
export async function executeWithAccount({
  account,
  calls,
  eoaWalletClient,
  publicClient,
  addLog,
  chain
}: {
  account: Account
  calls: Calls
  eoaWalletClient: WalletClient
  publicClient: PublicClient
  chain: Chain
  addLog?: (message: string | React.ReactNode) => void
}) {
  try {
    addLog?.('Preparing transaction...')
    
    // For this example, we'll just execute the first call directly
    // In a real implementation, you'd have a multicall contract
    const firstCall = calls[0]
    if (!firstCall) throw new Error('No calls provided')
    
    addLog?.('Signing transaction with MetaMask (as relay)...')
    
    // Send the transaction through the relay account
    const hash = await eoaWalletClient.sendTransaction({
      to: firstCall.to,
      data: firstCall.data,
      value: firstCall.value ?? 0n,
      account: account.address,
      chain,
    })
    
    addLog?.(`Transaction sent: ${hash}`)
    
    return hash
  } catch (error) {
    console.error('Failed to execute transaction:', error)
    throw error
  }
}

/**
 * Load an existing WebAuthn account using stored credential
 */
export async function loadAccount({ 
  credentialId 
}: { 
  credentialId: string 
}) {
  // This would typically load from storage
  if (!storedCredential || storedCredential.id !== credentialId) {
    throw new Error('Credential not found')
  }
  
  const account = toWebAuthnAccount({
    credential: storedCredential,
  })
  
  webAuthnAccount = account
  
  return {
    address: account.publicKey,
    webAuthnAccount: account,
    credential: storedCredential,
  }
}

/**
 * Get the current WebAuthn account
 */
export function getAccount(): Account | null {
  if (!webAuthnAccount || !storedCredential) {
    return null
  }
  
  return {
    address: webAuthnAccount.publicKey,
    webAuthnAccount,
    credential: storedCredential,
  }
}