import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWalletClient, useChainId, useChains, useBalance } from 'wagmi'
import { type Address, type Hex, type WalletClient } from 'viem'
import {
  createPasskeyDelegation,
  executeWithPasskey,
  getDelegationStatus,
  clearDelegation,
  generateLocalAccount,
  createWalletFromPrivateKey,
  type Call,
  type WalletType,
} from './eip-7702'

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
}: {
  addLog?: (message: string | React.ReactNode) => void
}) {
  const queryClient = useQueryClient()
  const chainId = useChainId()
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

export function useStoredLocalAccount() {
  const chainId = useChainId()
  const chains = useChains()
  const chain = chains.find((c) => c.id === chainId)
  
  return useQuery({
    queryKey: ['storedLocalAccount', chainId],
    queryFn: () => {
      const stored = getStoredLocalAccount(chainId)
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

export function useLocalAccountBalance() {
  const { data: storedAccount } = useStoredLocalAccount()
  
  return useBalance({
    address: storedAccount?.address,
  })  
}

export function useCreatePasskeyDelegation({
  contractAddress,
  addLog,
}: {
  contractAddress: Address
  addLog?: (message: string | React.ReactNode) => void
}) {
  const queryClient = useQueryClient()
  const { data: metamaskWallet } = useWalletClient()
  const chainId = useChainId()
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

export function useClearDelegation() {
  const queryClient = useQueryClient()
  const chainId = useChainId()
  
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