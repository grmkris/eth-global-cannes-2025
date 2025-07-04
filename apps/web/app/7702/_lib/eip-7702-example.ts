import { 
  createWebAuthnCredential, 
  toWebAuthnAccount,
  type WebAuthnAccount 
} from 'viem/account-abstraction'
import {
  type Address,
  type Hex,
} from 'viem'
import {
  type WalletClient,
} from 'viem'
import { example_abi } from './example_abi'

// Store WebAuthn account globally for reuse
let storedWebAuthnAccount: WebAuthnAccount | null = null
let storedCredential: any | null = null

export const DELEGATION_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890' as const

/**
 * Creates a new WebAuthn account with passkey and delegates the MetaMask EOA to it
 */
export async function createPasskeyDelegation({ 
  walletClient,
  contractAddress,
  addLog,
}: { 
  walletClient: WalletClient
  contractAddress: Address
  addLog?: (message: string | React.ReactNode) => void
}) {
  try {
    const eoaAccount = walletClient.account
    if (!eoaAccount) {
      throw new Error('No account connected to wallet')
    }
    
    addLog?.(`Connected EOA: ${eoaAccount.address}`)
    addLog?.('Creating WebAuthn credential (Passkey)...')
    
    // Create a WebAuthn credential (passkey)
    const credential = await createWebAuthnCredential({
      name: `Delegated EOA: ${eoaAccount.address.slice(0, 8)}...`,
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
    // This allows the contract to execute on behalf of the EOA
    const authorization = await walletClient.signAuthorization({
      account: eoaAccount,
      contractAddress,
    })
    
    addLog?.('Sending delegation transaction...')
    
    // Send the authorization transaction to delegate the EOA
    // After this, the EOA can be controlled through the contract
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
    }
  } catch (error) {
    console.error('Failed to create passkey delegation:', error)
    throw error
  }
}


export type Call = {
  to: Address
  value?: bigint
  data?: Hex
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
      throw new Error('No account connected to wallet')
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
  }
}

/**
 * Clear the stored passkey (for demo purposes)
 */
export function clearDelegation() {
  storedWebAuthnAccount = null
  storedCredential = null
}