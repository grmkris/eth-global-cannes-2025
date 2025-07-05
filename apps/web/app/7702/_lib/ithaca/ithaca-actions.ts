import {
  createWebAuthnCredential,
  toWebAuthnAccount
} from 'viem/account-abstraction'
import {
  type Address,
  type Hex,
  createWalletClient,
  http,
  type Chain,
  type WalletClient,
  keccak256,
  createPublicClient,
  encodePacked,
  parseSignature,
  encodeFunctionData,
} from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { sign as webauthnSign, type PublicKey } from 'webauthn-p256'
import React from 'react'
import { delegationAbi } from './delegation-abi'
import { erc20Abi } from './erc20-abi'
import { networkConfigs } from '../network-config'

export type WalletType = 'metamask' | 'local' | 'cold'

// WebAuthn storage keys with ithaca prefix
const STORAGE_KEYS = {
  WEBAUTHN_CREDENTIAL: 'ithaca_webauthn_credential',
  WALLET_TYPE: 'ithaca_wallet_type',
  PUBLIC_KEY: 'ithaca_public_key',
  KEY_INDEX: 'ithaca_key_index',
} as const

// Helper functions for WebAuthn data persistence
function storeWebAuthnData(data: {
  credential: any
  walletType: WalletType
  publicKey: { x: string; y: string }
  keyIndex?: number
}) {
  try {
    // Store credential with necessary data only (can't store functions)
    const credentialData = {
      id: data.credential.id,
      publicKey: Array.from(data.credential.publicKey),
      type: data.credential.type,
    }
    localStorage.setItem(STORAGE_KEYS.WEBAUTHN_CREDENTIAL, JSON.stringify(credentialData))
    localStorage.setItem(STORAGE_KEYS.WALLET_TYPE, data.walletType)
    localStorage.setItem(STORAGE_KEYS.PUBLIC_KEY, JSON.stringify(data.publicKey))
    if (data.keyIndex !== undefined) {
      localStorage.setItem(STORAGE_KEYS.KEY_INDEX, data.keyIndex.toString())
    }
  } catch (error) {
    console.error('Failed to store WebAuthn data:', error)
  }
}

function getStoredWebAuthnData(): {
  credential: any | null
  walletType: WalletType | null
  publicKey: { x: bigint; y: bigint } | null
  keyIndex: number | null
} | null {
  try {
    const credentialStr = localStorage.getItem(STORAGE_KEYS.WEBAUTHN_CREDENTIAL)
    const walletType = localStorage.getItem(STORAGE_KEYS.WALLET_TYPE) as WalletType | null
    const publicKeyStr = localStorage.getItem(STORAGE_KEYS.PUBLIC_KEY)
    const keyIndexStr = localStorage.getItem(STORAGE_KEYS.KEY_INDEX)

    if (!credentialStr || !walletType || !publicKeyStr) {
      return null
    }

    const credentialData = JSON.parse(credentialStr)
    const publicKeyData = JSON.parse(publicKeyStr)

    // Reconstruct credential object
    const credential = {
      id: credentialData.id,
      publicKey: new Uint8Array(credentialData.publicKey),
      type: credentialData.type,
    }

    // Convert public key coordinates back to bigint
    const publicKey = {
      x: BigInt(publicKeyData.x),
      y: BigInt(publicKeyData.y),
    }

    const keyIndex = keyIndexStr ? parseInt(keyIndexStr) : null

    return { credential, walletType, publicKey, keyIndex }
  } catch (error) {
    console.error('Failed to get stored WebAuthn data:', error)
    return null
  }
}

function clearWebAuthnStorage() {
  localStorage.removeItem(STORAGE_KEYS.WEBAUTHN_CREDENTIAL)
  localStorage.removeItem(STORAGE_KEYS.WALLET_TYPE)
  localStorage.removeItem(STORAGE_KEYS.PUBLIC_KEY)
  localStorage.removeItem(STORAGE_KEYS.KEY_INDEX)
  localStorage.removeItem('webauthn_nonce')
}

export type Call = {
  to: Address
  value: bigint
  data: Hex
}

/**
 * Helper function to create a mint call for the ExperimentERC20 contract
 */
export function createMintCall(contractAddress: Address, to: Address, amount: bigint): Call {
  return {
    to: contractAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'mint',
      args: [to, amount],
    }),
  }
}

/**
 * Helper function to create a mintForEther call for the ExperimentERC20 contract
 */
export function createMintForEtherCall(contractAddress: Address, etherAmount: bigint): Call {
  return {
    to: contractAddress,
    value: etherAmount,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'mintForEther',
    }),
  }
}

/**
 * Helper function to create a transfer call for the ExperimentERC20 contract
 */
export function createTransferCall(contractAddress: Address, to: Address, amount: bigint): Call {
  return {
    to: contractAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [to, amount],
    }),
  }
}

/**
 * Helper function to create a burnForEther call for the ExperimentERC20 contract
 */
export function createBurnForEtherCall(contractAddress: Address, amount: bigint): Call {
  return {
    to: contractAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'burnForEther',
      args: [amount],
    }),
  }
}

export async function authorize({
  walletClient,
  publicKey,
}: { walletClient: WalletClient; publicKey: PublicKey }) {
  const publicClient = createPublicClient({
    chain: walletClient.chain,
    transport: http(),
  })

  const nonce = await publicClient.readContract({
    address: networkConfigs[walletClient.chain?.id ?? 0]?.experimentDelegationAddress ?? '0x0000000000000000000000000000000000000000',
    abi: delegationAbi,
    functionName: 'nonce',
  })
  
  const expiry = BigInt(0) // no expiry

  // Sign an EIP-7702 authorization to inject the ExperimentDelegation contract
  // onto the EOA.
  const authorization = await walletClient.signAuthorization({
    account: walletClient.account!,
    contractAddress: networkConfigs[walletClient.chain?.id ?? 0]?.experimentDelegationAddress ?? '0x0000000000000000000000000000000000000000',
    executor: 'self',
  })
  
  // Send the authorize transaction
  const hash = await walletClient.writeContract({
    address: walletClient.account!.address,
    abi: delegationAbi,
    functionName: 'authorize',
    args: [
      { x: publicKey.x, y: publicKey.y },
      expiry
    ],
    authorizationList: [authorization],
    chain: walletClient.chain,
    account: walletClient.account!,
  })

  // Wait for the transaction to be mined
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  
  // Since this is likely the first key being added, the index should be 0
  // In a production system, you'd parse the logs or read the keys array length
  const keyIndex = 0
  
  return { hash, keyIndex }
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

    addLog?.(`Using ${walletType} EOA: ${eoaAccount.address}`)
    addLog?.('Creating WebAuthn credential (Passkey)...')

    // Create a WebAuthn credential (passkey)
    const credential = await createWebAuthnCredential({
      name: `Ithaca Delegated ${walletType} EOA: ${eoaAccount.address.slice(0, 8)}...`,
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

    addLog?.(`Passkey created with ID: ${credential.id.slice(0, 16)}...`)
    addLog?.('Signing EIP-7702 authorization to delegate EOA to contract...')
    addLog?.('Initializing Ithaca delegation contract with public key...')
    addLog?.(`Public Key X: ${pubKeyX.toString(16).slice(0, 16)}...`)
    addLog?.(`Public Key Y: ${pubKeyY.toString(16).slice(0, 16)}...`)

    const { hash, keyIndex } = await authorize({ walletClient, publicKey: { x: pubKeyX, y: pubKeyY } })
    
    // Store in localStorage for persistence including keyIndex
    storeWebAuthnData({
      credential,
      walletType,
      publicKey: { x: pubKeyX.toString(), y: pubKeyY.toString() },
      keyIndex: keyIndex
    })

    const txHashLink = `https://${walletClient.chain?.name}.etherscan.io/tx/${hash}`
    addLog?.(`Delegation transaction sent: ${txHashLink}`)
    addLog?.(`Key authorized with index: ${keyIndex}`)
    addLog?.('EOA successfully delegated! Passkey can now control transactions.')

    return {
      eoaAddress: eoaAccount.address,
      passkeyId: credential.id,
      authorizationHash: hash,
      webAuthnAccount,
      credential,
      walletType,
      keyIndex,
    }
  } catch (error) {
    console.error('Failed to create passkey delegation:', error)
    throw error
  }
}

/**
 * Encode calls for multiSend format
 */
function encodeMultiSendCalls(calls: Call[]): Hex {
  let encoded = '0x' as Hex
  
  for (const call of calls) {
    // operation (1 byte): 0 for call
    encoded = (encoded + '00') as Hex
    // to (20 bytes)
    encoded = (encoded + call.to.slice(2).padStart(40, '0')) as Hex
    // value (32 bytes)
    encoded = (encoded + call.value.toString(16).padStart(64, '0')) as Hex
    // data length (32 bytes)
    const dataLength = (call.data.length - 2) / 2 // bytes length
    encoded = (encoded + dataLength.toString(16).padStart(64, '0')) as Hex
    // data
    encoded = (encoded + call.data.slice(2)) as Hex
  }
  
  return encoded
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
    const storedData = getStoredWebAuthnData()
    if (!storedData || !storedData.credential || storedData.keyIndex === null) {
      throw new Error('No passkey or key index found. Please create a delegation first.')
    }

    const { credential: storedCredential, keyIndex } = storedData

    // Recreate WebAuthn account from stored credential
    const storedWebAuthnAccount = toWebAuthnAccount({ credential: storedCredential })

    const eoaAccount = walletClient.account
    if (!eoaAccount) {
      throw new Error('No account found in wallet client')
    }

    addLog?.('Authenticating with passkey...')
    const publicClient = createPublicClient({
      chain: walletClient.chain,
      transport: http(),
    })
    const nonce = await publicClient.readContract({
      address: eoaAccount.address,
      abi: delegationAbi,
      functionName: 'nonce',
    })

    // Encode calls in multiSend format
    const encodedCalls = encodeMultiSendCalls(calls)

    // Hash the message
    const messageHash = keccak256(
      encodePacked(['uint256', 'bytes'], [nonce, encodedCalls])
    )

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

    // Parse client data JSON to extract challenge index and type index
    const clientDataJSON = webauthn.clientDataJSON
    const challengeIndex = clientDataJSON.indexOf('"challenge"')
    const typeIndex = clientDataJSON.indexOf('"type"')

    // Prepare WebAuthn metadata
    const metadata = {
      authenticatorData: webauthn.authenticatorData as Hex,
      clientDataJSON: webauthn.clientDataJSON,
      challengeIndex: challengeIndex,
      typeIndex: typeIndex,
      userVerificationRequired: false,
    }

    addLog?.('Sending transaction through delegated EOA...')

    const hash = await walletClient.writeContract({
      address: eoaAccount.address,
      abi: delegationAbi,
      functionName: 'execute',
      args: [
        encodedCalls,
        { r, s },
        metadata,
        keyIndex
      ],
      account: eoaAccount,
      chain: walletClient.chain,
    })

    const txHashLink = `https://${walletClient.chain?.name}.etherscan.io/tx/${hash}`
    addLog?.(`Transaction executed: ${txHashLink}`)
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
    ; (account as any).privateKey = privateKey

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
  const storedData = getStoredWebAuthnData()
  if (!storedData) {
    return null
  }

  const { credential, walletType, keyIndex } = storedData

  // Note: WebAuthn account needs to be recreated when needed
  // since we can't serialize the full account object

  return {
    passkeyId: credential?.id,
    webAuthnAccount: null, // Will be recreated when needed
    credential,
    walletType,
    keyIndex,
  }
}

/**
 * Clear the stored passkey (for demo purposes)
 */
export function clearDelegation() {
  clearWebAuthnStorage()
}