import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWalletClient, useChainId, useChains, useBalance, useReadContract } from 'wagmi'
import { type Address, type Hex, type WalletClient } from 'viem'
import { useState, useEffect } from 'react'
import {
  createPasskeyDelegation,
  executeWithPasskey,
  getDelegationStatus,
  clearDelegation,
  generateLocalAccount,
  createWalletFromPrivateKey,
  type Call,
  type WalletType,
} from './ithaca-actions'
import { erc20Abi } from './erc20-abi'
import { networkConfigs } from '../network-config'

// Store selected chain ID for local accounts
function getSelectedChainId(): number | null {
  const stored = localStorage.getItem('ithaca_selected_chain_id')
  return stored ? parseInt(stored) : null
}

function setSelectedChainId(chainId: number) {
  localStorage.setItem('ithaca_selected_chain_id', chainId.toString())
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
  const key = `ithaca_local_account_${chainId}`
  const stored = localStorage.getItem(key)
  if (!stored) return null
  
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

function storeLocalAccount(chainId: number, address: Address, privateKey: Hex) {
  const key = `ithaca_local_account_${chainId}`
  localStorage.setItem(key, JSON.stringify({ address, privateKey }))
}

function clearLocalAccount(chainId: number) {
  const key = `ithaca_local_account_${chainId}`
  localStorage.removeItem(key)
}

// Helper function to create wallet client from stored account
function createWalletClientFromStorage(chainId: number, chains: readonly any[]): WalletClient | null {
  const storedAccount = getStoredLocalAccount(chainId)
  const chain = chains.find((c) => c.id === chainId)
  
  if (!storedAccount || !chain) return null
  
  return createWalletFromPrivateKey({ 
    privateKey: storedAccount.privateKey, 
    chain 
  })
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
    mutationKey: ['generateLocalAccountIthaca'],
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
      
      // Invalidate to refetch local account info
      await queryClient.invalidateQueries({ queryKey: ['storedLocalAccountIthaca'] })
      
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
    queryKey: ['storedLocalAccountIthaca', chainId],
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
    mutationKey: ['createPasskeyDelegationIthaca'],
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
        // Always create wallet client from stored private key
        const storedAccount = getStoredLocalAccount(chainId)
        if (storedAccount && storedAccount.privateKey) {
          // Recreate wallet client from stored private key
          walletClient = createWalletFromPrivateKey({ 
            privateKey: storedAccount.privateKey, 
            chain 
          })
        } else {
          // Generate new if not found
          walletClient = generateLocalAccount({ chain })
          const account = walletClient.account
          if (account && (account as any).privateKey) {
            storeLocalAccount(chainId, account.address, (account as any).privateKey)
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
      
      // Invalidate queries to refetch
      await queryClient.invalidateQueries({ queryKey: ['passkeyDelegationIthaca'] })
      
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
  return useMutation({
    mutationKey: ['executeWithPasskeyIthaca'],
    mutationFn: async ({ calls, walletClient }: { calls: Call[]; walletClient: WalletClient }) => {
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
    queryKey: ['passkeyDelegationIthaca'],
    queryFn: () => getDelegationStatus(),
    staleTime: Infinity,
  })
}

// Helper function to get wallet client based on wallet type
export function useGetWalletClient({
  chainId: customChainId,
}: {
  chainId?: number
} = {}) {
  const { data: metamaskWallet } = useWalletClient()
  const wagmiChainId = useChainId()
  const chainId = customChainId || wagmiChainId
  const chains = useChains()
  const { data: passkeyDelegation } = usePasskeyDelegation()
  
  const getWalletClient = (): WalletClient | null => {
    if (!passkeyDelegation?.walletType) return null
    
    if (passkeyDelegation.walletType === 'metamask') {
      return metamaskWallet || null
    } else if (passkeyDelegation.walletType === 'local') {
      return createWalletClientFromStorage(chainId, chains)
    }
    
    return null
  }
  
  return {
    walletClient: getWalletClient(),
    walletType: passkeyDelegation?.walletType || null
  }
}

export function useClearDelegation(customChainId?: number) {
  const queryClient = useQueryClient()
  const wagmiChainId = useChainId()
  const chainId = customChainId || wagmiChainId
  
  return useMutation({
    mutationKey: ['clearDelegationIthaca'],
    mutationFn: async ({ clearLocalStorage = false }: { clearLocalStorage?: boolean } = {}) => {
      clearDelegation()
      
      if (clearLocalStorage) {
        clearLocalAccount(chainId)
        await queryClient.invalidateQueries({ queryKey: ['storedLocalAccountIthaca'] })
      }
      
      await queryClient.invalidateQueries({ queryKey: ['passkeyDelegationIthaca'] })
    },
    onError: (error) => {
      console.error('Failed to clear delegation:', error)
    },
  })
}

export function useExecuteIthacaOperation({
  addLog,
  erc20ContractAddress,
}: {
  addLog?: (message: string | React.ReactNode) => void
  erc20ContractAddress: Address
}) {
  const executeWithPasskeyMutation = useExecuteWithPasskey({ addLog })
  
  return useMutation({
    mutationKey: ['executeIthacaOperation'],
    mutationFn: async (props: { calls: Call[]; walletClient: WalletClient }) => {
      if (!props.calls || props.calls.length  === 0) throw new Error('Calls required for Ithaca operation')
      if (!props.walletClient) throw new Error('Wallet client required for Ithaca operation')
      return executeWithPasskeyMutation.mutateAsync(props)
    },
    onError: (error) => {
      console.error('Failed to execute Ithaca operation:', error)
    },
  })
}

// Hook to check ERC20 token balance
export function useIthacaTokenBalance({
  address,
  chainId,
}: {
  address?: Address
  chainId?: number
}) {
  const erc20Address = networkConfigs[chainId || 0]?.experimentERC20Address
  
  return useReadContract({
    address: erc20Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId,
    query: {
      enabled: !!address && !!erc20Address,
    }
  })
}