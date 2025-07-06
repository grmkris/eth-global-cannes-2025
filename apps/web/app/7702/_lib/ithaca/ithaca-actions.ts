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

    // Create the challenge exactly as the contract does: keccak256(abi.encodePacked(nonce, calls))
    // Note: The contract uses nonce++ so it uses the current value then increments
    const challenge = keccak256(
      encodePacked(['uint256', 'bytes'], [nonce, encodedCalls])
    )

    addLog?.('Signing transaction with passkey...')
    addLog?.(`Challenge (hex): ${challenge}`)
    addLog?.(`Nonce: ${nonce}`)
    
    // Double-check the challenge format
    addLog?.(`Challenge length: ${challenge.length} chars (should be 66 for 0x + 64 hex chars)`)
    addLog?.(`Challenge is valid hex: ${/^0x[0-9a-fA-F]{64}$/.test(challenge)}`)

    // Sign with WebAuthn
    const { signature, webauthn } = await webauthnSign({
      hash: challenge,
      credentialId: storedCredential.id,
    })

    // Extract r and s from signature
    let r: bigint, s: bigint
    
    // Enhanced debugging for signature format
    addLog?.(`Raw signature from WebAuthn: ${signature}`)
    addLog?.(`Signature type: ${typeof signature}`)
    if (typeof signature === 'object') {
      addLog?.(`Signature object keys: ${Object.keys(signature).join(', ')}`)
      addLog?.(`Signature object: ${JSON.stringify(signature)}`)
    }
    
    // Try to parse the signature using viem's parseSignature first
    try {
      if (typeof signature === 'string' || (typeof signature === 'object' && signature.toString)) {
        const sigStr = typeof signature === 'string' ? signature : signature.toString();
        addLog?.('Attempting to parse signature with viem parseSignature...')
        
        // parseSignature expects a hex string with 0x prefix
        const sigHex = sigStr.startsWith('0x') ? sigStr : `0x${sigStr}`;
        const parsed = parseSignature(sigHex as Hex);
        
        r = parsed.r;
        s = parsed.s;
        
        addLog?.(`Viem parsed - r: ${r.toString(16).slice(0, 16)}..., s: ${s.toString(16).slice(0, 16)}...`)
        addLog?.(`Viem parsed - v: ${parsed.v}, yParity: ${parsed.yParity}`)
      } else if (typeof signature === 'object' && 'r' in signature && 's' in signature) {
        addLog?.("Signature is object with r and s properties")
        // If signature is already an object with r and s
        r = BigInt(signature.r)
        s = BigInt(signature.s)
      } else {
        throw new Error('Signature format not suitable for viem parsing')
      }
    } catch (parseError) {
      addLog?.(`Viem parseSignature failed: ${parseError}, trying manual parsing...`)
      
      // Fallback to manual parsing
      const sigStr = typeof signature === 'string' ? signature : '';
      const isDER = sigStr.startsWith('0x3044') || sigStr.startsWith('0x3045') || 
                    sigStr.startsWith('3044') || sigStr.startsWith('3045');
      
      if (isDER) {
        addLog?.('Detected DER-encoded signature, parsing...')
        // Parse DER-encoded signature
        const sigHex = sigStr.startsWith('0x') ? sigStr.slice(2) : sigStr;
        
        // DER format: 30 [total-length] 02 [r-length] [r] 02 [s-length] [s]
        let offset = 0;
        
        // Skip sequence tag (30) and length
        offset += 2; // Skip 30
        const totalLength = parseInt(sigHex.substr(offset, 2), 16);
        offset += 2;
        
        // Parse r
        if (sigHex.substr(offset, 2) !== '02') {
          throw new Error('Invalid DER signature: expected integer tag for r');
        }
        offset += 2;
        const rLength = parseInt(sigHex.substr(offset, 2), 16);
        offset += 2;
        let rHex = sigHex.substr(offset, rLength * 2);
        offset += rLength * 2;
        
        // Parse s
        if (sigHex.substr(offset, 2) !== '02') {
          throw new Error('Invalid DER signature: expected integer tag for s');
        }
        offset += 2;
        const sLength = parseInt(sigHex.substr(offset, 2), 16);
        offset += 2;
        let sHex = sigHex.substr(offset, sLength * 2);
        
        // Remove leading zeros if present (DER encoding adds them for positive sign)
        if (rHex.startsWith('00') && rHex.length > 64) {
          rHex = rHex.slice(2);
        }
        if (sHex.startsWith('00') && sHex.length > 64) {
          sHex = sHex.slice(2);
        }
        
        // Pad to 32 bytes if necessary
        rHex = rHex.padStart(64, '0');
        sHex = sHex.padStart(64, '0');
        
        r = BigInt('0x' + rHex);
        s = BigInt('0x' + sHex);
        
        addLog?.(`DER parsed - r: ${rHex.slice(0, 16)}..., s: ${sHex.slice(0, 16)}...`)
      } else if (typeof signature === 'string') {
        addLog?.("Signature is raw hex string")
        // If signature is a hex string, extract r and s
        const sigHex = signature.startsWith('0x') ? signature.slice(2) : signature
        
        // Validate hex string length (should be 128 chars for 64 bytes)
        if (sigHex.length !== 128) {
          throw new Error(`Invalid signature length: expected 128 chars, got ${sigHex.length}`)
        }
        
        r = BigInt('0x' + sigHex.slice(0, 64))
        s = BigInt('0x' + sigHex.slice(64, 128))
      } else {
        addLog?.(`Unexpected signature format: ${JSON.stringify(signature)}`)
        throw new Error('Invalid signature format')
      }
    }
    
    // Validate r and s are within valid range for P256
    const P256_ORDER = BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551')
    if (r >= P256_ORDER || s >= P256_ORDER) {
      throw new Error('Invalid signature: r or s exceeds curve order')
    }
    if (r === 0n || s === 0n) {
      throw new Error('Invalid signature: r or s is zero')
    }

    // Parse client data JSON to extract challenge index and type index
    const clientDataJSON = webauthn.clientDataJSON
    const challengeIndex = clientDataJSON.indexOf('"challenge"')
    const typeIndex = clientDataJSON.indexOf('"type"')

    addLog?.(`Client Data JSON: ${clientDataJSON}`)
    addLog?.(`Challenge Index: ${challengeIndex}, Type Index: ${typeIndex}`)
    addLog?.(`Authenticator Data: ${webauthn.authenticatorData}`)
    addLog?.(`Signature r: ${r.toString(16).slice(0, 16)}..., s: ${s.toString(16).slice(0, 16)}...`)
    
    // Log the stored public key for verification
    if (storedData.publicKey) {
      addLog?.(`Stored Public Key - X: ${storedData.publicKey.x.toString(16).slice(0, 16)}..., Y: ${storedData.publicKey.y.toString(16).slice(0, 16)}...`)
    }
    
    // Read the public key from the contract to verify it matches
    try {
      const contractKey = await publicClient.readContract({
        address: eoaAccount.address,
        abi: delegationAbi,
        functionName: 'keys',
        args: [BigInt(keyIndex)]
      })
      
      const contractX = contractKey[2].x.toString(16).padStart(64, '0')
      const contractY = contractKey[2].y.toString(16).padStart(64, '0')
      const storedX = storedData.publicKey!.x.toString(16).padStart(64, '0')
      const storedY = storedData.publicKey!.y.toString(16).padStart(64, '0')
      
      addLog?.(`Contract Public Key - X: ${contractX.slice(0, 16)}..., Y: ${contractY.slice(0, 16)}...`)
      addLog?.(`Key authorized: ${contractKey[0]}, Expiry: ${contractKey[1]}`)
      
      // Verify public keys match
      if (contractX !== storedX || contractY !== storedY) {
        addLog?.('⚠️ WARNING: Public key mismatch between stored and contract!')
        addLog?.(`Stored X: ${storedX}`)
        addLog?.(`Contract X: ${contractX}`)
        addLog?.(`Stored Y: ${storedY}`)
        addLog?.(`Contract Y: ${contractY}`)
      } else {
        addLog?.('✓ Public key matches between stored and contract')
      }
    } catch (error) {
      addLog?.(`Could not read key from contract - error: ${error}`)
      addLog?.('This might indicate the key was not properly authorized')
    }

    // Prepare WebAuthn metadata
    const metadata = {
      authenticatorData: webauthn.authenticatorData as Hex,
      clientDataJSON: webauthn.clientDataJSON,
      challengeIndex: challengeIndex,
      typeIndex: typeIndex,
      userVerificationRequired: false,
    }

    // Calculate the expected message hash that the contract will verify
    // This should match: sha256(authenticatorData || sha256(clientDataJSON))
    const crypto = await import('crypto')
    const clientDataHash = '0x' + crypto.createHash('sha256').update(clientDataJSON).digest('hex')
    const messageData = Buffer.concat([
      Buffer.from(webauthn.authenticatorData.slice(2), 'hex'),
      Buffer.from(clientDataHash.slice(2), 'hex')
    ])
    const expectedMessageHash = '0x' + crypto.createHash('sha256').update(messageData).digest('hex')
    
    addLog?.(`Expected message hash for P256 verify: ${expectedMessageHash}`)
    addLog?.(`ClientData hash: ${clientDataHash}`)
    
    // Log exact values being sent to contract
    addLog?.('=== Contract Call Parameters ===')
    addLog?.(`Encoded Calls: ${encodedCalls.slice(0, 66)}...`)
    addLog?.(`Signature R: ${r.toString()}`)
    addLog?.(`Signature S: ${s.toString()}`)
    addLog?.(`Signature R (hex): 0x${r.toString(16).padStart(64, '0')}`)
    addLog?.(`Signature S (hex): 0x${s.toString(16).padStart(64, '0')}`)
    addLog?.(`Key Index: ${keyIndex}`)
    
    // Log the exact signature object being sent
    const signatureObject = { r, s }
    addLog?.(`Signature object for contract: ${JSON.stringify(signatureObject, (_, v) => typeof v === 'bigint' ? v.toString() : v)}`)
    
    // Verify the signature components match what we logged earlier
    const rHex = r.toString(16).padStart(64, '0')
    const sHex = s.toString(16).padStart(64, '0')
    const reconstructedSig = rHex + sHex
    addLog?.(`Reconstructed signature: 0x${reconstructedSig}`)
    
    // Check if P256 precompile is available
    addLog?.('Note: This contract uses P256 precompile at address 0x14 (EIP-7212)')
    addLog?.('If your network doesn\'t support this precompile, verification will fail')
    
    // Log transaction details
    addLog?.(`From (tx.origin will be): ${eoaAccount.address}`)
    addLog?.(`To (delegated contract): ${eoaAccount.address}`)
    addLog?.('The delegated contract will execute the encoded calls')
    
    // Decode the first call to understand what's being executed
    try {
      const firstCallTo = '0x' + encodedCalls.slice(2 + 2, 2 + 2 + 40); // Skip op byte and get address
      const firstCallValue = '0x' + encodedCalls.slice(2 + 2 + 40, 2 + 2 + 40 + 64); // Get value
      addLog?.(`First call target: ${firstCallTo}`)
      addLog?.(`First call value: ${BigInt(firstCallValue)} wei`)
    } catch (e) {
      addLog?.('Could not decode first call')
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