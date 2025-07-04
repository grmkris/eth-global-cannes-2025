import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePublicClient, useWalletClient } from 'wagmi'
import { type Address } from 'viem'
import {
  createPasskeyDelegation,
  executeWithPasskey,
  getDelegationStatus,
  clearDelegation,
  type Call,
} from './eip-7702-example'

export function useCreatePasskeyDelegation({
  contractAddress,
  addLog,
}: {
  contractAddress: Address
  addLog?: (message: string | React.ReactNode) => void
}) {
  const { data: walletClient } = useWalletClient()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationKey: ['createPasskeyDelegation'],
    mutationFn: async () => {
      if (!walletClient) {
        throw new Error('Wallet not connected')
      }
      if (!walletClient.account) {
        throw new Error('Wallet account not connected')
      }
      
      const result = await createPasskeyDelegation({
        walletClient,
        contractAddress,
        addLog,
      })
      
      // Invalidate the delegation query to refetch
      await queryClient.invalidateQueries({ queryKey: ['passkeyDelegation'] })
      
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
  const { data: walletClient } = useWalletClient()
  
  return useMutation({
    mutationKey: ['executeWithPasskey'],
    mutationFn: async ({ calls }: { calls: Call[] }) => {
      if (!walletClient) {
        throw new Error('Wallet not connected')
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
    queryKey: ['passkeyDelegation'],
    queryFn: () => getDelegationStatus(),
    staleTime: Infinity,
  })
}

export function useClearDelegation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationKey: ['clearDelegation'],
    mutationFn: async () => {
      clearDelegation()
      await queryClient.invalidateQueries({ queryKey: ['passkeyDelegation'] })
    },
    onError: (error) => {
      console.error('Failed to clear delegation:', error)
    },
  })
}

