// Example usage of snoj contract with executeWithPasskey

import { useExecuteSnojOperation } from './eip-7702-hooks'
import { getContractAddress } from './network-config'
import { createSnojTestCall, createTransferCall, type Call } from './eip-7702'
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
        operation: 'test',
        testNumber: 42n, // Example test number
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
  tokenAddress,
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
        createTransferCall(tokenAddress, '0x1234...', 100n),
        createTransferCall(tokenAddress, '0x5678...', 200n),
        createTransferCall(tokenAddress, '0x9abc...', 300n),
      ]

      await executeSnojOperation.mutateAsync({
        operation: 'execute',
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