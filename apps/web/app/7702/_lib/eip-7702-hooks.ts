import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWalletClient, useChainId, useChains, useBalance } from 'wagmi'
import { type Address, type Hex, type WalletClient } from 'viem'
import { useState, useEffect } from 'react'
import {
  createPasskeyDelegation,
  executeWithPasskey,
  getDelegationStatus,
  clearDelegation,
  generateLocalAccount,
  createWalletFromPrivateKey,
  createMintCall,
  createMintToSelfCall,
  createTransferCall,
  createApproveCall,
  createSnojTestCall,
  createSnojExecuteCall,
  type Call,
  type WalletType,
  type TokenOperation,
} from './eip-7702'

// Store selected chain ID for local accounts
function getSelectedChainId(): number | null {
  const stored = localStorage.getItem('eip7702_selected_chain_id')
  return stored ? parseInt(stored) : null
}

function setSelectedChainId(chainId: number) {
  localStorage.setItem('eip7702_selected_chain_id', chainId.toString())
}

// Hook to manage selected chain ID for local accounts
export function useLocalAccountChainId() {
  const wagmiChainId = useChainId()
  const [selectedChainId, setLocalSelectedChainId] = useState<number | null>(null)
  
  useEffect(() => {
    const stored = getSelectedChainId()
    if (stored) {
      setLocalSelectedChainId(stored)
    } else {
      setLocalSelectedChainId(wagmiChainId)
    }
  }, [])
  
  const setChainId = (chainId: number) => {
    setSelectedChainId(chainId)
    setLocalSelectedChainId(chainId)
  }
  
  return {
    chainId: selectedChainId || wagmiChainId,
    setChainId,
    isLocalAccountMode: selectedChainId !== null && selectedChainId !== wagmiChainId
  }
}

// Helper functions for local storage
function getStoredLocalAccount(chainId: number): { address: Address; privateKey: Hex } | null {
  const key = `eip7702_local_account_${chainId}`
  const stored = localStorage.getItem(key)
  if (!stored) return null
  
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

function storeLocalAccount(chainId: number, address: Address, privateKey: Hex) {
  const key = `eip7702_local_account_${chainId}`
  localStorage.setItem(key, JSON.stringify({ address, privateKey }))
}

function clearLocalAccount(chainId: number) {
  const key = `eip7702_local_account_${chainId}`
  localStorage.removeItem(key)
}

export function useGenerateLocalAccount({
  addLog,
  chainId: customChainId,
}: {
  addLog?: (message: string | React.ReactNode) => void
  chainId?: number
}) {
  const queryClient = useQueryClient()
  const wagmiChainId = useChainId()
  const chainId = customChainId || wagmiChainId
  const chains = useChains()
  const chain = chains.find((c) => c.id === chainId)
  
  return useMutation({
    mutationKey: ['generateLocalAccount'],
    mutationFn: async () => {
      if (!chain) {
        throw new Error('No chain found')
      }
      
      const walletClient = generateLocalAccount({ chain })
      const account = walletClient.account
      if (!account) {
        throw new Error('No account in wallet client')
      }
      
      // Store in localStorage for persistence
      const privateKey = account.signMessage ? (account as any).privateKey : undefined
      if (privateKey) {
        storeLocalAccount(chainId, account.address, privateKey)
      }
      
      addLog?.(`Generated local EOA: ${account.address}`)
      addLog?.(`Private key stored in localStorage for chain ${chain.id}`)
      
      // Store wallet client for later use
      queryClient.setQueryData(['localWalletClient'], walletClient)
      
      // Invalidate to refetch local account info
      await queryClient.invalidateQueries({ queryKey: ['storedLocalAccount'] })
      
      return { walletClient }
    },
    onError: (error) => {
      console.error('Failed to generate local account:', error)
    },
  })
}

export function useStoredLocalAccount(customChainId?: number) {
  const chainId = customChainId
  const chains = useChains()
  const chain = chains.find((c) => c.id === chainId)
  
  return useQuery({
    queryKey: ['storedLocalAccount', chainId],
    queryFn: () => {
      const stored = getStoredLocalAccount(chainId || 0)
      if (!stored || !chain) return null
      
      // Return just the basic info - wallet client will be recreated when needed
      return {
        address: stored.address,
        privateKey: stored.privateKey,
      }
    },
    staleTime: 30000, // Refresh every 30 seconds
  })
}

export function useLocalAccountBalance(customChainId?: number) {
  const { data: storedAccount } = useStoredLocalAccount(customChainId)

  console.log('storedAccount', storedAccount, customChainId)
  
  return useBalance({
    address: storedAccount?.address,
    chainId: customChainId,
  })  
}

export function useCreatePasskeyDelegation({
  contractAddress,
  addLog,
  chainId: customChainId,
}: {
  contractAddress: Address
  addLog?: (message: string | React.ReactNode) => void
  chainId?: number
}) {
  const queryClient = useQueryClient()
  const { data: metamaskWallet } = useWalletClient()
  const wagmiChainId = useChainId()
  const chainId = customChainId || wagmiChainId
  const chains = useChains()
  const chain = chains.find((c) => c.id === chainId)
  
  return useMutation({
    mutationKey: ['createPasskeyDelegationMulti'],
    mutationFn: async ({ 
      walletType, 
      privateKey 
    }: { 
      walletType: WalletType
      privateKey?: Hex 
    }) => {
      if (!chain) {
        throw new Error('No chain found')
      }
      
      let walletClient: WalletClient
      
      if (walletType === 'metamask') {
        if (!metamaskWallet) {
          throw new Error('MetaMask wallet not connected')
        }
        walletClient = metamaskWallet
      } else if (walletType === 'local') {
        // For local, check if we have a stored wallet client
        const storedWalletClient = queryClient.getQueryData<WalletClient>(['localWalletClient'])
        if (storedWalletClient) {
          walletClient = storedWalletClient
        } else {
          // Check if we have stored account info
          const storedAccount = getStoredLocalAccount(chainId)
          if (storedAccount && storedAccount.privateKey) {
            // Recreate wallet client from stored private key
            walletClient = createWalletFromPrivateKey({ 
              privateKey: storedAccount.privateKey, 
              chain 
            })
            queryClient.setQueryData(['localWalletClient'], walletClient)
          } else {
            // Generate new if not found
            walletClient = generateLocalAccount({ chain })
            const account = walletClient.account
            if (account && (account as any).privateKey) {
              storeLocalAccount(chainId, account.address, (account as any).privateKey)
            }
            queryClient.setQueryData(['localWalletClient'], walletClient)
          }
        }
        addLog?.(`Using local EOA: ${walletClient.account?.address}`)
      } else if (walletType === 'cold' && privateKey) {
        walletClient = createWalletFromPrivateKey({ privateKey, chain })
        addLog?.(`Using cold wallet: ${walletClient.account?.address}`)
      } else {
        throw new Error('Invalid wallet type or missing private key')
      }
      
      const result = await createPasskeyDelegation({
        walletClient,
        contractAddress,
        addLog,
        walletType,
      })
      
      // Store wallet client for later use
      queryClient.setQueryData(['currentWalletClient'], walletClient)
      
      // Invalidate queries to refetch
      await queryClient.invalidateQueries({ queryKey: ['passkeyDelegationMulti'] })
      
      return result
    },
    onError: (error) => {
      console.error('Failed to create passkey delegation:', error)
    },
  })
}

export function useExecuteWithPasskey({
  addLog,
}: {
  addLog?: (message: string | React.ReactNode) => void
}) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationKey: ['executeWithPasskeyMulti'],
    mutationFn: async ({ calls }: { calls: Call[] }) => {
      const walletClient = queryClient.getQueryData<WalletClient>(['currentWalletClient'])
      
      if (!walletClient) {
        throw new Error('No wallet client found. Please create a delegation first.')
      }
      
      return executeWithPasskey({
        walletClient,
        calls,
        addLog,
      })
    },
    onError: (error) => {
      console.error('Failed to execute with passkey:', error)
    },
  })
}

export function usePasskeyDelegation() {
  return useQuery({
    queryKey: ['passkeyDelegationMulti'],
    queryFn: () => getDelegationStatus(),
    staleTime: Infinity,
  })
}

export function useCurrentWalletClient() {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['currentWalletClient'],
    queryFn: () => queryClient.getQueryData<WalletClient>(['currentWalletClient']) || null,
    staleTime: Infinity,
  })
}

export function useClearDelegation(customChainId?: number) {
  const queryClient = useQueryClient()
  const wagmiChainId = useChainId()
  const chainId = customChainId || wagmiChainId
  
  return useMutation({
    mutationKey: ['clearDelegationMulti'],
    mutationFn: async ({ clearLocalStorage = false }: { clearLocalStorage?: boolean } = {}) => {
      clearDelegation()
      queryClient.removeQueries({ queryKey: ['currentWalletClient'] })
      queryClient.removeQueries({ queryKey: ['localWalletClient'] })
      
      if (clearLocalStorage) {
        clearLocalAccount(chainId)
        await queryClient.invalidateQueries({ queryKey: ['storedLocalAccount'] })
      }
      
      await queryClient.invalidateQueries({ queryKey: ['passkeyDelegationMulti'] })
    },
    onError: (error) => {
      console.error('Failed to clear delegation:', error)
    },
  })
}

export function useExecuteTokenOperation({
  addLog,
  tokenAddress,
}: {
  addLog?: (message: string | React.ReactNode) => void
  tokenAddress: Address
}) {
  const executeWithPasskeyMutation = useExecuteWithPasskey({ addLog })
  
  return useMutation({
    mutationKey: ['executeTokenOperation'],
    mutationFn: async ({ 
      operation, 
      amount, 
      recipient,
      spender,
    }: { 
      operation: TokenOperation
      amount: bigint
      recipient?: Address
      spender?: Address
    }) => {
      let call: Call
      
      switch (operation) {
        case 'mint':
          if (recipient) {
            call = createMintCall(tokenAddress, recipient, amount)
            addLog?.(`Minting ${amount} tokens to ${recipient}`)
          } else {
            call = createMintToSelfCall(tokenAddress, amount)
            addLog?.(`Minting ${amount} tokens to self`)
          }
          break
        case 'transfer':
          if (!recipient) throw new Error('Recipient required for transfer')
          call = createTransferCall(tokenAddress, recipient, amount)
          addLog?.(`Transferring ${amount} tokens to ${recipient}`)
          break
        case 'approve':
          if (!spender) throw new Error('Spender required for approve')
          call = createApproveCall(tokenAddress, spender, amount)
          addLog?.(`Approving ${spender} to spend ${amount} tokens`)
          break
        default:
          throw new Error('Invalid operation')
      }
      
      return executeWithPasskeyMutation.mutateAsync({ calls: [call] })
    },
    onError: (error) => {
      console.error('Failed to execute token operation:', error)
    },
  })
}

export function useExecuteSnojOperation({
  addLog,
  snojContractAddress,
}: {
  addLog?: (message: string | React.ReactNode) => void
  snojContractAddress: Address
}) {
  const executeWithPasskeyMutation = useExecuteWithPasskey({ addLog })
  
  return useMutation({
    mutationKey: ['executeSnojOperation'],
    mutationFn: async ({ 
      operation,
      testNumber,
      calls,
    }: { 
      operation: 'test' | 'execute'
      testNumber?: bigint
      calls?: Call[]
    }) => {
      let call: Call
      
      switch (operation) {
        case 'test':
          if (testNumber === undefined) throw new Error('Test number required for test operation')
          call = createSnojTestCall(snojContractAddress, testNumber)
          addLog?.(`Calling snoj test function with number: ${testNumber}`)
          break
        case 'execute':
          if (!calls || calls.length === 0) throw new Error('Calls required for execute operation')
          call = createSnojExecuteCall(snojContractAddress, calls)
          addLog?.(`Executing ${calls.length} calls through snoj contract`)
          break
        default:
          throw new Error('Invalid snoj operation')
      }
      
      return executeWithPasskeyMutation.mutateAsync({ calls: [call] })
    },
    onError: (error) => {
      console.error('Failed to execute snoj operation:', error)
    },
  })
}