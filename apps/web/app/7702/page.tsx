'use client'

import { useState } from 'react'
import { useAccount, useClient } from 'wagmi'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Separator } from '@workspace/ui/components/separator'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { type Calls } from './_lib/eip-7702-example'
import { useCreateEIP7702Account, useExecuteEIP7702, useEIP7702Account } from './_lib/eip-7702-hooks'
import { example_abi } from './_lib/example_abi'
import { encodeFunctionData } from 'viem'
import { CheckCircle2, AlertCircle, Loader2, Key, Wallet, ArrowRight } from 'lucide-react'

const CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890' as const // TODO: Replace with deployed contract

export default function EIP7702Page() {
  const { address: connectedAddress, isConnected } = useAccount()
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string | React.ReactNode) => {
    const logMessage = typeof message === 'string' ? message : 'Action completed'
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${logMessage}`])
  }

  // React Query hooks
  const { data: eip7702Account } = useEIP7702Account()
  const createAccountMutation = useCreateEIP7702Account({
    contractAddress: CONTRACT_ADDRESS,
    addLog,
  })
  const executeTransactionMutation = useExecuteEIP7702({ addLog })

  const handleCreatePasskey = async () => {
    try {
      await createAccountMutation.mutateAsync()
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const handleExecuteTransaction = async () => {
    if (!eip7702Account) return
    
    try {
      // Example: Call the ping function
      const pingCalldata = encodeFunctionData({
        abi: example_abi,
        functionName: 'ping',
      })
      
      const calls: Calls = [
        {
          to: CONTRACT_ADDRESS,
          data: pingCalldata,
          value: 0n,
        },
      ]
      
      await executeTransactionMutation.mutateAsync({
        account: eip7702Account,
        calls,
      })
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">EIP-7702 with Passkeys Demo</h1>
          <p className="text-muted-foreground">
            Create and manage smart accounts using passkeys for secure, passwordless transactions
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
                EIP-7702 WebAuthn Account
              </CardTitle>
              <CardDescription>
                Create a smart account controlled by a passkey using EIP-7702
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!eip7702Account ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    This will create a WebAuthn account and delegate it to a smart contract using EIP-7702
                  </p>
                  <Button 
                    onClick={handleCreatePasskey}
                    disabled={createAccountMutation.isPending}
                    size="lg"
                    className="w-full"
                  >
                    {createAccountMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Passkey Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">WebAuthn Address:</span>
                      <Badge variant="outline" className="font-mono">
                        {eip7702Account.address}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Passkey ID:</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {eip7702Account.credential.id.substring(0, 16)}...
                      </Badge>
                    </div>
                    {eip7702Account.authorizationHash && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Authorization TX:</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {eip7702Account.authorizationHash.substring(0, 16)}...
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Execute Transaction</h4>
                    <p className="text-sm text-muted-foreground">
                      Use your passkey to sign and execute transactions through the delegated contract
                    </p>
                    <Button
                      onClick={handleExecuteTransaction}
                      disabled={executeTransactionMutation.isPending}
                      className="w-full"
                    >
                      {executeTransactionMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        'Execute Sample Transaction'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {(createAccountMutation.error || executeTransactionMutation.error) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {createAccountMutation.error?.message || executeTransactionMutation.error?.message}
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
            <p>1. Connect your MetaMask wallet (acts as the relay/sponsor)</p>
            <p>2. Create a WebAuthn account with a passkey</p>
            <p>3. The system authorizes the WebAuthn account to use EIP-7702 delegation</p>
            <p>4. Execute transactions using your passkey for authentication</p>
            <p>5. MetaMask sponsors the gas fees while the passkey controls the account</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}