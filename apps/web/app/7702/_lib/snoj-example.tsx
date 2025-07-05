// Example usage of snoj contract with executeWithPasskey

import { useExecuteSnojOperation } from './eip-7702-hooks'
import { getContractAddress } from './network-config'
import { createSnojReceiveCall, createSnojTestCall, type Call } from './eip-7702'
import { type Address } from 'viem'

// Example 1: Call the test function
export function SnojTestExample({ 
  chainId,
  addLog 
}: { 
  chainId: number
  addLog?: (message: string | React.ReactNode) => void 
}) {
  const snojContractAddress = getContractAddress(chainId, 'snojContractAddress')
  const executeSnojOperation = useExecuteSnojOperation({
    addLog,
    snojContractAddress: snojContractAddress!,
  })

  const handleTestCall = async () => {
    try {
      await executeSnojOperation.mutateAsync({
        calls: [createSnojTestCall(snojContractAddress!, 42n)],
      })
    } catch (error) {
      console.error('Failed to call test:', error)
    }
  }

  return (
    <button onClick={handleTestCall}>
      Call Snoj Test Function
    </button>
  )
}

// Example 2: Execute multiple calls through snoj contract
export function SnojBatchExecuteExample({ 
  chainId,
  addLog,
}: { 
  chainId: number
  addLog?: (message: string | React.ReactNode) => void
  tokenAddress: Address
}) {
  const snojContractAddress = getContractAddress(chainId, 'snojContractAddress')
  const executeSnojOperation = useExecuteSnojOperation({
    addLog,
    snojContractAddress: snojContractAddress!,
  })

  const handleBatchExecute = async () => {
    try {
      // Example: Create multiple transfer calls
      const calls: Call[] = [
        createSnojReceiveCall(snojContractAddress!, 100n),
        createSnojReceiveCall(snojContractAddress!, 200n),
        createSnojReceiveCall(snojContractAddress!, 300n),
      ]

      await executeSnojOperation.mutateAsync({
        calls,
      })
    } catch (error) {
      console.error('Failed to execute batch:', error)
    }
  }

  return (
    <button onClick={handleBatchExecute}>
      Execute Batch Transfers
    </button>
  )
}

// Example 3: Direct usage with executeWithPasskey
import { useExecuteWithPasskey } from './eip-7702-hooks'

export function DirectSnojUsageExample({ 
  chainId,
  addLog,
}: { 
  chainId: number
  addLog?: (message: string | React.ReactNode) => void
}) {
  const snojContractAddress = getContractAddress(chainId, 'snojContractAddress')
  const executeWithPasskey = useExecuteWithPasskey({ addLog })

  const handleDirectCall = async () => {
    try {
      // Create a snoj test call
      const testCall = createSnojTestCall(snojContractAddress!, 123n)
      
      // Execute it using passkey
      await executeWithPasskey.mutateAsync({
        calls: [testCall],
      })
    } catch (error) {
      console.error('Failed to execute:', error)
    }
  }

  return (
    <button onClick={handleDirectCall}>
      Direct Snoj Call with Passkey
    </button>
  )
}