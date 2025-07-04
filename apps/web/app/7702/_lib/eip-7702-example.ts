import { 
  createWebAuthnCredential, 
  toWebAuthnAccount,
  type WebAuthnAccount 
} from 'viem/account-abstraction'
import {
  type Account,
  type Address,
  type Hex,
} from 'viem'
import {
  type WalletClient,
  type PublicClient,
  type Client,
  type Chain,
} from 'viem'
import { example_abi } from './example_abi'
import { signAuthorization } from 'viem/experimental'
import { writeContract } from 'viem/actions'

/**
 * Creates a new WebAuthn account with passkey and authorizes it for EIP-7702
 */
export async function createAccount({ 
  client,
  eoaAccount,
  contractAddress,
  addLog,
  chain
}: { 
  client: Client
  eoaAccount: Account
  publicClient: PublicClient
  contractAddress: Address
  chain: Chain
  addLog?: (message: string | React.ReactNode) => void
}) {
  try {
    addLog?.('Creating WebAuthn credential (Passkey)...')
    
    // Create a WebAuthn credential (passkey)
    const credential = await createWebAuthnCredential({
      name: `EIP-7702 Account ${eoaAccount.address}`,
    })
    
    // Create WebAuthn account from credential
    const account = toWebAuthnAccount({
      credential,
    })
    
    const webAuthnAccount = account
    const storedCredential = credential
    
    addLog?.(`WebAuthn account created: ${account.publicKey}`)
      
    // Get the relay account from wallet client (MetaMask)
    const relayAccount = client.account
    if (!relayAccount) {
      throw new Error('No account connected to wallet')
    }
    
    addLog?.('Signing EIP-7702 authorization...')
    
    // Sign authorization to delegate the WebAuthn account to the contract
    const authorization = await signAuthorization(client, {
      account: account.publicKey,
      contractAddress,
    })
    
    addLog?.('Deploying delegation contract to WebAuthn account...')
    
    // Initialize the delegation by calling a function on the contract
    // This will deploy the contract code to the WebAuthn account address
    const hash = await writeContract(client,{
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


export type Call = {
  to: Address
  value?: bigint
  data?: Hex
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
  calls: Call[]
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
export async function loadAccount(props: {
  name: string

}) {
  // This would typically load from storage
  if (!credential) {
    throw new Error('Credential not found')
  }
  
  const account = toWebAuthnAccount({
    credential,
  })
  
  const webAuthnAccount = account
  
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