import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useChainId, usePublicClient, useWalletClient } from 'wagmi'
import { type Address } from 'viem'
import {
  createAccount,
  executeWithAccount,
  getAccount,
  loadAccount,
  type Account,
  type Calls,
} from './eip-7702-example'

export function useCreateEIP7702Account({
  contractAddress,
  addLog,
}: {
  contractAddress: Address
  addLog?: (message: string | React.ReactNode) => void
}) {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationKey: ['createEIP7702Account'],
    mutationFn: async () => {
      if (!walletClient || !publicClient) {
        throw new Error('Wallet not connected')
      }
      
      const account = await createAccount({
        eoaWalletClient: walletClient,
        publicClient,
        contractAddress,
        addLog,
        chain: walletClient.chain,
      })
      
      // Invalidate the account query to refetch
      await queryClient.invalidateQueries({ queryKey: ['eip7702Account'] })
      
      return account
    },
    onError: (error) => {
      console.error('Failed to create EIP-7702 account:', error)
    },
  })
}

export function useExecuteEIP7702({
  addLog,
}: {
  addLog?: (message: string | React.ReactNode) => void
}) {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  
  return useMutation({
    mutationKey: ['executeEIP7702'],
    mutationFn: async ({
      account,
      calls,
    }: {
      account: Account
      calls: Calls
    }) => {
      if (!walletClient || !publicClient) {
        throw new Error('Wallet not connected')
      }
      
      return executeWithAccount({
        account,
        calls,
        eoaWalletClient: walletClient,
        publicClient,
        addLog,
        chain: walletClient.chain,
      })
    },
    onError: (error) => {
      console.error('Failed to execute transaction:', error)
    },
  })
}

export function useEIP7702Account() {
  return useQuery({
    queryKey: ['eip7702Account'],
    queryFn: () => getAccount(),
    staleTime: Infinity,
  })
}

export function useLoadEIP7702Account() {
  return useMutation({
    mutationKey: ['loadEIP7702Account'],
    mutationFn: async ({ credentialId }: { credentialId: string }) => {
      const account = await loadAccount({ credentialId })
      
      return account
    },
    onError: (error) => {
      console.error('Failed to load account:', error)
    },
  })
}

