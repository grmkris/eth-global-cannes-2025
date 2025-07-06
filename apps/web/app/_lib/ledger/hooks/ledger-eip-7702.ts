import { type Address, type Hex, type WalletClient, type Chain, type PublicClient, type TransactionReceipt, type TransactionSerializable } from 'viem'
import { createWalletClient, http, createPublicClient } from 'viem'
import { 
  signDelegationAuthorization, 
  getAccountAddress,
  getCurrentSignerEth,
  getCurrentSessionId,
  signDelegationAuthorizationRaw,
  signTransactionLedger,
} from '../ledgerService'

export interface LedgerAuthorizationParams {
  contractAddress: Address
  chainId: number
  chain: Chain
  nonce?: number
}

/**
 * Creates an EIP-7702 authorization using Ledger hardware wallet
 * This uses the existing ledgerService signDelegationAuthorization function
 */
export async function createLedgerAuthorization({
  contractAddress,
  chainId,
  chain,
  nonce = 0,
}: LedgerAuthorizationParams) {
  try {
    // Check if Ledger is connected
    const signerEth = getCurrentSignerEth()
    if (!signerEth) {
      throw new Error('No Ledger device connected. Please connect a device first.')
    }
    
    // Get the Ledger address
    const ledgerAddress = await getAccountAddress()
    
    // Sign the delegation authorization using the existing service
    const signature = await signDelegationAuthorizationRaw(
      chainId,
      contractAddress,
      nonce
    )
    
    // The signature returned from signDelegationAuthorization should have r, s, v
    // Format it according to EIP-7702 requirements
    const authorization = {
      chainId,
      contractAddress,
      nonce: BigInt(nonce),
      address: ledgerAddress as Address,
      r: signature.r as Hex,
      s: signature.s as Hex,
      v: BigInt(signature.v),
      yParity: signature.v - 27 === 0 ? 0 : 1,
    }
    
    return authorization
  } catch (error) {
    console.error('Failed to create Ledger authorization:', error)
    throw error
  }
}

/**
 * Creates a wallet client for Ledger that can be used with EIP-7702
 */
export function createLedgerWalletClient({
  address,
  chain,
}: {
  address: Address
  chain: Chain
}): WalletClient {
  // Create a custom account that will use Ledger for signing
  const account = {
    address,
    type: 'local' as const,
    // These methods would need to be implemented to use the Ledger transport
    // For now, we're creating a stub that would need to be extended
    signMessage: async ({ message }: { message: string | Hex }) => {
      throw new Error('Ledger signing not implemented in this context')
    },
    signTransaction: async (transaction: any) => {
      throw new Error('Ledger signing not implemented in this context')
    },
    signTypedData: async (typedData: any) => {
      throw new Error('Ledger signing not implemented in this context')
    },
  }
  
  return createWalletClient({
    account,
    chain,
    transport: http(),
  })
}

/**
 * Creates a Ledger wallet client with EIP-7702 authorization capability
 */
export async function createLedgerWalletClientWithAuth({
  chain,
  contractAddress,
}: {
  chain: Chain
  contractAddress: Address
}): Promise<{ walletClient: WalletClient; authorization: any }> {
  const address = await getAccountAddress()
  
  // Create the authorization
  const authorization = await createLedgerAuthorization({
    contractAddress,
    chainId: chain.id,
    chain,
  })
  
  // Create wallet client
  const walletClient = createLedgerWalletClient({
    address: address as Address,
    chain,
  })
  
  return { walletClient, authorization }
}
function bigIntReplacer(_key: string, value: any): any {
  return typeof value === 'bigint' ? value.toString() : value;
}



/**
 * Sends a transaction with EIP-7702 authorization list
 */
export async function sendLedgerTransactionWithAuthorization({
  chain,
  authorization,
  to,
  value = BigInt(0),
  data = '0x' as Hex,
}: {
  chain: Chain
  authorization: any
  to: Address
  value?: bigint
  data?: Hex
}): Promise<Hex> {
  try {
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    })
    
    console.log("sendLedgerTransactionWithAuthorization Authorization:", authorization);
    // Build the transaction with authorization list
    const transaction : TransactionSerializable = {
      to,
      value,
      data,
      authorizationList: [authorization],
      chainId: chain.id
    }
    
    // Sign the transaction using Ledger
    console.log("sendLedgerTransactionWithAuthorization Signing transaction:", transaction);
    const signedTx = await signTransactionLedger(transaction)
    
    console.log("sendLedgerTransactionWithAuthorizationSigned transaction:", signedTx);
    // Send the raw transaction
    const hash = await publicClient.sendRawTransaction({
      serializedTransaction: signedTx
    })
    
    return hash
  } catch (error) {
    console.error('Failed to send transaction with authorization:', error)
    throw error
  }
}

/**
 * Waits for a transaction receipt
 */
export async function waitForLedgerTransaction({
  chain,
  hash,
}: {
  chain: Chain
  hash: Hex
}): Promise<TransactionReceipt> {
  const publicClient = createPublicClient({
    chain,
    transport: http(),
  })
  
  return publicClient.waitForTransactionReceipt({
    hash,
  })
}