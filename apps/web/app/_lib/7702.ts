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
  encodeAbiParameters,
  parseAbiParameters,
  createPublicClient,
  encodePacked,
  parseSignature,
} from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { sign as webauthnSign, type PublicKey } from 'webauthn-p256'
import React from 'react'
import { networkConfigs } from './network-config'
import { passkeyDelegationAbi } from './abi/webauthn_delegation_abi'


// WebAuthn storage keys
const STORAGE_KEYS = {
  WEBAUTHN_CREDENTIAL: 'eip7702_webauthn_credential',
  WALLET_TYPE: 'eip7702_wallet_type',
  PUBLIC_KEY: 'eip7702_public_key',
} as const

export type WalletType = 'metamask' | 'local' | 'cold'

// Helper functions for WebAuthn data persistence
function storeWebAuthnData(data: {
  credential: any
  publicKey: { x: string; y: string }
  walletType?: WalletType
}) {
  try {
    // Store credential with necessary data only (can't store functions)
    const credentialData = {
      id: data.credential.id,
      publicKey: Array.from(data.credential.publicKey),
      type: data.credential.type,
    }
    localStorage.setItem(STORAGE_KEYS.WEBAUTHN_CREDENTIAL, JSON.stringify(credentialData))
    localStorage.setItem(STORAGE_KEYS.PUBLIC_KEY, JSON.stringify(data.publicKey))
    if (data.walletType) {
      localStorage.setItem(STORAGE_KEYS.WALLET_TYPE, data.walletType)
    }
  } catch (error) {
    console.error('Failed to store WebAuthn data:', error)
  }
}

function getStoredWebAuthnData(): {
  credential: any | null
  publicKey: { x: bigint; y: bigint } | null
} | null {
  try {
    const credentialStr = localStorage.getItem(STORAGE_KEYS.WEBAUTHN_CREDENTIAL)
    const publicKeyStr = localStorage.getItem(STORAGE_KEYS.PUBLIC_KEY)

    if (!credentialStr || !publicKeyStr) {
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

    return { credential, publicKey }
  } catch (error) {
    console.error('Failed to get stored WebAuthn data:', error)
    return null
  }
}

function clearWebAuthnStorage() {
  localStorage.removeItem(STORAGE_KEYS.WEBAUTHN_CREDENTIAL)
  localStorage.removeItem(STORAGE_KEYS.WALLET_TYPE)
  localStorage.removeItem(STORAGE_KEYS.PUBLIC_KEY)
  localStorage.removeItem('webauthn_nonce')
}

// Remove hardcoded address - will be passed as parameter instead

export type Call = {
  to: Address
  value: bigint
  data: Hex
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

async function authorize({
  walletClient,
  publicKey,
  addLog,
}: { walletClient: WalletClient; publicKey: PublicKey; addLog?: (message: string | React.ReactNode) => void    }) {
  const nonce = BigInt(0) // initial nonce will always be 0
  const expiry = BigInt(0) // no expiry

  // Compute digest to sign for the authorize function.
  const digest = keccak256(
    encodePacked(
      ['uint256', 'uint256', 'uint256', 'uint256'],
      [nonce, publicKey.x, publicKey.y, expiry],
    ),
  )

  addLog?.('Authorizing with passkey...')

  // Sign the authorize digest and parse signature to object format required by
  // the contract.
  if (!walletClient.account) {
    throw new Error('No account found in wallet client')
  }
  const signature = parseSignature(await walletClient.signMessage({ message: digest, account: walletClient.account }))
  addLog?.('Signature: ' + signature)
  // Sign an EIP-7702 authorization to inject the ExperimentDelegation contract
  // onto the EOA.
  const authorization = await walletClient.signAuthorization({
    account: walletClient.account,
    contractAddress: networkConfigs[walletClient.chain?.id ?? 0]?.webAuthnDelegationAddress ?? '0x0000000000000000000000000000000000000000',
    executor: 'self',
  })
  addLog?.('Authorization: ' + authorization) 
  const hash = await walletClient.writeContract({
    address: walletClient.account.address,
    abi: passkeyDelegationAbi,
    functionName: 'initialize',
    args: [walletClient.account.address, publicKey.x, publicKey.y],
    authorizationList: [authorization],
    chain: walletClient.chain,
    account: walletClient.account,
  })
  addLog?.('Hash: ' + hash)
  return hash
}

/**
 * Creates a new WebAuthn account with passkey and delegates any type of EOA to it
 */
export async function createPasskeyDelegation({
  walletClient,
  addLog,
}: {
  walletClient: WalletClient
  addLog?: (message: string | React.ReactNode) => void
}) {
  try {
    const eoaAccount = walletClient.account
    if (!eoaAccount) {
      throw new Error('No account found in wallet client')
    }

    // Will be stored after credential creation

    addLog?.(`Using EOA: ${eoaAccount.address}`)
    addLog?.('Creating WebAuthn credential (Passkey)...')

    // Create a WebAuthn credential (passkey)
    const credential = await createWebAuthnCredential({
      name: `Delegated EOA: ${eoaAccount.address.slice(0, 8)}...`,
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

    // Store in localStorage for persistence
    storeWebAuthnData({
      credential,
      publicKey: { x: pubKeyX.toString(), y: pubKeyY.toString() },
    })

    addLog?.(`Passkey created with ID: ${credential.id.slice(0, 16)}...`)
    addLog?.('Signing EIP-7702 authorization to delegate EOA to contract...')

    // For WebAuthn delegation, we need to initialize with the public key
    // First deploy or use existing WebAuthn contract
    addLog?.('Initializing WebAuthn delegation contract with public key...')
    addLog?.(`Public Key X: ${pubKeyX.toString(16).slice(0, 16)}...`)
    addLog?.(`Public Key Y: ${pubKeyY.toString(16).slice(0, 16)}...`)

    const hash = await authorize({ walletClient, publicKey: { x: pubKeyX, y: pubKeyY }, addLog   })
    const txHashLink = `https://${walletClient.chain?.name}.etherscan.io/tx/${hash}`
    addLog?.(`Delegation transaction sent: ${txHashLink}`)
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
    if (!storedData || !storedData.credential) {
      throw new Error('No passkey found. Please create a delegation first.')
    }

    const { credential: storedCredential } = storedData

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

    const nonce = (await publicClient.readContract({
      address: networkConfigs[walletClient.chain?.id ?? 0]?.webAuthnDelegationAddress ?? '0x0000000000000000000000000000000000000000',
      abi: passkeyDelegationAbi,
      functionName: 'getNonce',
      args: [eoaAccount.address],
    })) + 1n
    
    console.log('nonce', nonce)
    console.log('chainId', walletClient.chain?.id)
    if (!walletClient.account?.address) {
      throw new Error('No account found in wallet client')
    }
    // Encode the calls and nonce for signing
    const messageToSign = encodeAbiParameters(
      parseAbiParameters('address eoa, (address to, uint256 value, bytes data)[] calls, uint256 nonce'),
      [
        walletClient.account?.address,
        calls.map(call => ({
          to: call.to,
          value: call.value,
          data: call.data,
        })),
        nonce,
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
      address: eoaAccount.address,
      abi: passkeyDelegationAbi,
      functionName: 'execute',
      args: [eoaAccount.address, calls, nonce, webAuthnSignature],
      account: eoaAccount,
      chain: walletClient.chain,
    })
    
    const txHashLink = `https://${walletClient.chain?.name}.etherscan.io/tx/${hash}`
    addLog?.(`Transaction executed: ${txHashLink}`)
    addLog?.('Transaction completed using passkey signature!')
    addLog?.('Signature: r=' + r.toString(16).slice(0, 8) + '..., s=' + s.toString(16).slice(0, 8) + '...')
    localStorage.setItem(`nonce-${eoaAccount.address}-${walletClient.chain?.id}`, nonce.toString())
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
  const storedData = getStoredWebAuthnData()
  if (!storedData) {
    return null
  }

  const { credential } = storedData

  // Note: WebAuthn account needs to be recreated when needed
  // since we can't serialize the full account object

  return {
    passkeyId: credential?.id,
    webAuthnAccount: null, // Will be recreated when needed
    credential,
  }
}

/**
 * Clear the stored passkey (for demo purposes)
 */
export function clearDelegation() {
  clearWebAuthnStorage()
}