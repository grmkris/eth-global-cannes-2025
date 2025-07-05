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
  type Chain,
  type WalletClient,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  createPublicClient,
} from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { sign as webauthnSign } from 'webauthn-p256'
import { passkeyDelegationAbi } from './webauthn_delegation_abi'
import { networkConfigs } from './network-config'

export type WalletType = 'metamask' | 'local' | 'cold'

// Store WebAuthn account globally for reuse
let storedWebAuthnAccount: WebAuthnAccount | null = null
let storedCredential: any | null = null
let storedWalletType: WalletType | null = null
let storedPublicKey: { x: bigint; y: bigint } | null = null

// Remove hardcoded address - will be passed as parameter instead

export type Call = {
  to: Address
  value: bigint
  data: Hex
}

export type TokenOperation = 'mint' | 'transfer' | 'approve'

/**
 * Helper function to create mint call data for SimpleMintableToken
 */
export function createMintCall(tokenAddress: Address, recipient: Address, amount: bigint): Call {
  const mintData = encodeAbiParameters(
    parseAbiParameters('address to, uint256 amount'),
    [recipient, amount]
  )
  
  return {
    to: tokenAddress,
    value: 0n,
    data: ('0x40c10f19' + mintData.slice(2)) as Hex, // mint(address,uint256) selector
  }
}

/**
 * Helper function to create mintToSelf call data
 */
export function createMintToSelfCall(tokenAddress: Address, amount: bigint): Call {
  const mintData = encodeAbiParameters(
    parseAbiParameters('uint256 amount'),
    [amount]
  )
  
  return {
    to: tokenAddress,
    value: 0n,
    data: ('0xb745c833' + mintData.slice(2)) as Hex, // mintToSelf(uint256) selector
  }
}

/**
 * Helper function to create transfer call data
 */
export function createTransferCall(tokenAddress: Address, to: Address, amount: bigint): Call {
  const transferData = encodeAbiParameters(
    parseAbiParameters('address to, uint256 amount'),
    [to, amount]
  )
  
  return {
    to: tokenAddress,
    value: 0n,
    data: ('0xa9059cbb' + transferData.slice(2)) as Hex, // transfer(address,uint256) selector
  }
}

/**
 * Helper function to create approve call data
 */
export function createApproveCall(tokenAddress: Address, spender: Address, amount: bigint): Call {
  const approveData = encodeAbiParameters(
    parseAbiParameters('address spender, uint256 amount'),
    [spender, amount]
  )
  
  return {
    to: tokenAddress,
    value: 0n,
    data: ('0x095ea7b3' + approveData.slice(2)) as Hex, // approve(address,uint256) selector
  }
}

/**
 * Helper function to create a test call for the snoj contract
 */
export function createSnojTestCall(contractAddress: Address, number: bigint): Call {
  const testData = encodeAbiParameters(
    parseAbiParameters('uint256 number'),
    [number]
  )
  
  return {
    to: contractAddress,
    value: 0n,
    data: ('0x29e99f07' + testData.slice(2)) as Hex, // test(uint256) selector
  }
}

export function createSnojReceiveCall(contractAddress: Address, amount: bigint): Call {
  return {
    to: contractAddress,
    data: '0x',
    value: amount,
  }
}

/**
 * Helper function to create an execute call for the snoj contract
 */
export function createSnojExecuteCall(contractAddress: Address, calls: Call[]): Call {
  const executeData = encodeAbiParameters(
    parseAbiParameters('(address to, uint256 value, bytes data)[] calls'),
    [calls.map(call => ({
      to: call.to,
      value: call.value ?? 0n,
      data: call.data ?? '0x',
    }))]
  )
  
  return {
    to: contractAddress,
    value: 0n,
    data: ('0x13e7c9d8' + executeData.slice(2)) as Hex, // execute((address,uint256,bytes)[]) selector
  }
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
    
    // Extract public key coordinates from the credential
    // The public key is in the credential's response.publicKey
    const publicKeyBytes = credential.publicKey
    // For P256, the public key is typically 65 bytes: 0x04 + 32 bytes X + 32 bytes Y
    const pubKeyX = BigInt('0x' + Buffer.from(publicKeyBytes.slice(1, 33)).toString('hex'))
    const pubKeyY = BigInt('0x' + Buffer.from(publicKeyBytes.slice(33, 65)).toString('hex'))
    
    // Store for later use
    storedWebAuthnAccount = webAuthnAccount
    storedCredential = credential
    storedPublicKey = { x: pubKeyX, y: pubKeyY }
    
    addLog?.(`Passkey created with ID: ${credential.id.slice(0, 16)}...`)
    addLog?.('Signing EIP-7702 authorization to delegate EOA to contract...')
    
    // For WebAuthn delegation, we need to initialize with the public key
    // First deploy or use existing WebAuthn contract
    addLog?.('Initializing WebAuthn delegation contract with public key...')
    addLog?.(`Public Key X: ${pubKeyX.toString(16).slice(0, 16)}...`)
    addLog?.(`Public Key Y: ${pubKeyY.toString(16).slice(0, 16)}...`)
    
    // Sign authorization to delegate the EOA to the contract
    const authorization = await walletClient.signAuthorization({
      account: eoaAccount,
      contractAddress,
    })
    
    addLog?.('Sending delegation transaction...')
    
    // Send the authorization transaction to delegate the EOA
    // This initializes the contract with the WebAuthn public key
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: passkeyDelegationAbi,
      functionName: 'initialize',
      args: [pubKeyX, pubKeyY],
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
    
    const publicClient = createPublicClient({
      chain: walletClient.chain,
      transport: http(),
    })
    // Get current nonce from storage (in production, fetch from contract)
    const currentNonce = await publicClient.readContract({
      address: networkConfigs[walletClient.chain?.id ?? 0]?.webAuthnDelegationAddress ?? '0x0000000000000000000000000000000000000000',
      abi: passkeyDelegationAbi,
      functionName: 'nonce',
    })

    console.log('currentNonce', currentNonce)
    
    // Encode the calls and nonce for signing
    const messageToSign = encodeAbiParameters(
      parseAbiParameters('(address to, uint256 value, bytes data)[] calls, uint256 nonce'),
      [
        calls.map(call => ({
          to: call.to,
          value: call.value ?? 0n,
          data: call.data ?? '0x',
        })),
        currentNonce,
      ]
    )
    
    // Hash the message
    const messageHash = keccak256(messageToSign)
    
    addLog?.('Signing transaction with passkey...')
    
    // Sign with WebAuthn
    const { signature, webauthn } = await webauthnSign({
      hash: messageHash,
      credentialId: storedCredential.id,
    })
    
    // Extract r and s from signature
    let r: bigint, s: bigint
    if (typeof signature === 'string') {
      // If signature is a hex string, extract r and s
      const sigHex = signature.startsWith('0x') ? signature.slice(2) : signature
      r = BigInt('0x' + sigHex.slice(0, 64))
      s = BigInt('0x' + sigHex.slice(64, 128))
    } else {
      console.log(signature)
      throw new Error('Invalid signature format')
    }
    
    // Extract client data fields (everything after challenge)
    let clientDataFields = ''
    if (webauthn.clientDataJSON) {
      const challengeEnd = webauthn.clientDataJSON.indexOf('",') + 2
      clientDataFields = webauthn.clientDataJSON.slice(challengeEnd, -1) // Remove closing }
    }
    
    // Encode WebAuthn signature data according to the contract's expected format
    const webAuthnSignature = encodeAbiParameters(
      parseAbiParameters('bytes authenticatorData, string clientDataFields, uint256 r, uint256 s'),
      [
        webauthn.authenticatorData as Hex,
        clientDataFields,
        r,
        s
      ]
    )
    
    addLog?.('Sending transaction through delegated EOA...')
    
    // ========== PASSKEY SIGNATURE IMPLEMENTATION ==========
    // The WebAuthn signature has been created using the passkey!
    // In a production implementation with the WebAuthnDelegation contract:
    // 
     const hash = await walletClient.writeContract({
       address: networkConfigs[walletClient.chain?.id ?? 0]?.webAuthnDelegationAddress ?? '0x0000000000000000000000000000000000000000',
       abi: passkeyDelegationAbi,
       functionName: 'execute',
       args: [calls, currentNonce, webAuthnSignature],
       account: eoaAccount,
       chain: walletClient.chain,
     })
    //
    // The contract will:
    // 1. Verify the WebAuthn signature using the P256 library
    // 2. Check authenticator flags (user presence)
    // 3. Verify the signature matches the stored public key
    // 4. Execute the calls if signature is valid
    //
    // For this demo with the simple Delegation contract,
    // we'll execute directly through the EOA but show the signature was created
    
    // Increment nonce for next transaction
    incrementNonce()
    
    addLog?.(`Transaction executed: ${hash}`)
    addLog?.('Transaction completed using passkey signature!')
    addLog?.('Signature: r=' + r.toString(16).slice(0, 8) + '..., s=' + s.toString(16).slice(0, 8) + '...')
    
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
  storedPublicKey = null
  localStorage.removeItem('webauthn_nonce')
}

/**
 * Get current nonce from localStorage (in production, fetch from contract)
 */
function getNonce(): bigint {
  const stored = localStorage.getItem('webauthn_nonce')
  return stored ? BigInt(stored) : 0n
}

/**
 * Increment nonce in localStorage
 */
function incrementNonce() {
  const current = getNonce()
  localStorage.setItem('webauthn_nonce', (current + 1n).toString())
}