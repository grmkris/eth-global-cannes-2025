'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Separator } from '@workspace/ui/components/separator'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { type Call } from './_lib/eip-7702-example'
import { useCreatePasskeyDelegation, useExecuteWithPasskey, usePasskeyDelegation, useClearDelegation } from './_lib/eip-7702-hooks'
import { example_abi } from './_lib/example_abi'
import { encodeFunctionData } from 'viem'
import { CheckCircle2, AlertCircle, Loader2, Key, Wallet, ArrowRight } from 'lucide-react'

// Replace with your deployed delegation contract address
const CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890' as const

export default function EIP7702Page() {
  const { address: connectedAddress, isConnected } = useAccount()
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string | React.ReactNode) => {
    const logMessage = typeof message === 'string' ? message : 'Action completed'
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${logMessage}`])
  }

  // React Query hooks
  const { data: delegation } = usePasskeyDelegation()
  const createDelegationMutation = useCreatePasskeyDelegation({
    contractAddress: CONTRACT_ADDRESS,
    addLog,
  })
  const executeWithPasskeyMutation = useExecuteWithPasskey({ addLog })
  const clearDelegationMutation = useClearDelegation()

  const handleCreateDelegation = async () => {
    try {
      await createDelegationMutation.mutateAsync()
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const handleExecuteWithPasskey = async () => {
    if (!delegation) return
    
    try {
      // Example: Call the ping function on the delegated contract
      const pingCalldata = encodeFunctionData({
        abi: example_abi,
        functionName: 'ping',
      })
      
      const calls: Call[] = [
        {
          to: CONTRACT_ADDRESS,
          data: pingCalldata,
          value: 0n,
        },
      ]
      
      await executeWithPasskeyMutation.mutateAsync({ calls })
    } catch (error) {
      // Error is handled by the mutation
    }
  }
  
  const handleClearDelegation = async () => {
    try {
      await clearDelegationMutation.mutateAsync()
      setLogs([])
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">EIP-7702 Delegation with Passkeys</h1>
          <p className="text-muted-foreground">
            Delegate your MetaMask wallet to a passkey for secure, passwordless transactions
          </p>
        </div>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Connected: {connectedAddress}</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span>Please connect your MetaMask wallet to continue</span>
                </div>
                <appkit-button />
              </div>
            )}
          </CardContent>
        </Card>

        {/* EIP-7702 Account Status */}
        {isConnected && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                EIP-7702 Passkey Delegation
              </CardTitle>
              <CardDescription>
                Delegate your MetaMask EOA to a passkey for secure transaction signing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!delegation ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    This will create a passkey and delegate your MetaMask wallet to a smart contract.
                    After delegation, you can use your passkey to sign transactions.
                  </p>
                  <Button 
                    onClick={handleCreateDelegation}
                    disabled={createDelegationMutation.isPending}
                    size="lg"
                    className="w-full"
                  >
                    {createDelegationMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Delegation...
                      </>
                    ) : (
                      <>
                        Delegate to Passkey
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Delegated EOA:</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {connectedAddress}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Passkey ID:</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {delegation.passkeyId.substring(0, 16)}...
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Delegation Contract:</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {CONTRACT_ADDRESS.substring(0, 10)}...
                      </Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Execute Transaction with Passkey</h4>
                    <p className="text-sm text-muted-foreground">
                      Use your passkey to authenticate and execute transactions through your delegated EOA
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleExecuteWithPasskey}
                        disabled={executeWithPasskeyMutation.isPending}
                        className="flex-1"
                      >
                        {executeWithPasskeyMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          'Execute Transaction'
                        )}
                      </Button>
                      <Button
                        onClick={handleClearDelegation}
                        disabled={clearDelegationMutation.isPending}
                        variant="outline"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {(createDelegationMutation.error || executeWithPasskeyMutation.error) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {createDelegationMutation.error?.message || executeWithPasskeyMutation.error?.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Activity Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet...</p>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <p key={index} className="text-sm font-mono">
                      {log}
                    </p>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Connect your MetaMask wallet (this is your EOA)</p>
            <p>2. Create a passkey and delegate your EOA to a smart contract</p>
            <p>3. The delegation allows the contract to execute on behalf of your EOA</p>
            <p>4. Use your passkey to authenticate and execute transactions</p>
            <p>5. Your EOA remains in control but can be operated via passkey</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}