'use client'

import React, { useState } from 'react'
import { useLedger } from '../hooks/useLedger'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Loader2, Send, CheckCircle, XCircle } from 'lucide-react'

export function LedgerSigningDemo() {
  const { 
    isConnected, 
    isDiscovering, 
    error, 
    accountAddress,
    connect, 
    disconnect, 
    signTransaction,
    getHardcodedTransaction 
  } = useLedger()
  const [isSigning, setIsSigning] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)



  const handleSignTransaction = async () => {
    if (!isConnected) return
    
    try {
      setIsSigning(true)
      setTxHash(null)
      
      const transaction = getHardcodedTransaction()
      console.log('Using hardcoded transaction:', transaction)
      
      const subscription = signTransaction(
        transaction,
        (state) => {
          console.log('Transaction signing state:', state)
          
          if (state.status === 'completed') {
            try {
              // Here you would typically broadcast the transaction
              // For demo purposes, we'll just show the signature
              const formattedSignature = typeof state.output === 'object' 
                ? JSON.stringify(state.output, null, 2) 
                : String(state.output)
              setSignature(formattedSignature)
              setTxHash('0x1234567890abcdef...') // Mock transaction hash
            } catch (broadcastError) {
              console.error('Broadcast error:', broadcastError)
            }
          } else if (state.status === 'error') {
            console.error('Signing error:', state.error)
          }
        },
        (error) => {
          console.error('Transaction signing error:', error)
          
          // Show user-friendly error message for app issues
          if (error?.errorCode === '6807' || error?.message?.includes('Unknown application name')) {
            alert('Ethereum app not found on Ledger device!\n\nPlease:\n1. Install the Ethereum app via Ledger Live\n2. Open the Ethereum app on your Ledger device\n3. Make sure the app shows "Application is ready"')
          }
        },
        () => {
          setIsSigning(false)
        }
      )
      
      // Cleanup subscription when component unmounts
      return () => subscription?.unsubscribe()
    } catch (err) {
      console.error('Failed to sign transaction:', err)
      setIsSigning(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Ledger Transaction Signing Demo
        </CardTitle>
        <CardDescription>
          Test transaction signing with your Ledger device using the observable pattern
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isConnected ? (
          <div className="space-y-4">
            <Button 
              onClick={connect} 
              disabled={isDiscovering}
              className="w-full"
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting to Ledger...
                </>
              ) : (
                'Connect Ledger Device'
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Connect your Ledger device to start signing transactions
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Connected to Ledger {accountAddress && `(${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)})`}
              </span>
            </div>



            {/* Transaction Signing */}
            <div className="space-y-3">
              <div className="text-sm font-medium">Transaction Signing (Hardcoded)</div>
              <div className="p-3 bg-muted rounded-md text-xs">
                <div><strong>To:</strong> 0x0A7Db9806d6ec8166fB97CD3F3C23a5d15Dbe91b</div>
                <div><strong>Value:</strong> 1 ETH</div>
                <div><strong>Gas Price:</strong> 20 Gwei</div>
                <div><strong>Gas Limit:</strong> 21,000</div>
              </div>
              <Button 
                onClick={handleSignTransaction}
                disabled={isSigning}
                variant="outline"
                className="w-full"
              >
                {isSigning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Sign Transaction
              </Button>
            </div>

            {/* Results */}
            {signature && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Signature</div>
                <div className="p-3 bg-muted rounded-md">
                  <code className="text-xs break-all">{signature}</code>
                </div>
              </div>
            )}

            {txHash && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Transaction Hash</div>
                <div className="p-3 bg-muted rounded-md">
                  <code className="text-xs break-all">{txHash}</code>
                </div>
              </div>
            )}

            {/* Disconnect */}
            <Button 
              onClick={disconnect} 
              variant="destructive" 
              className="w-full"
            >
              Disconnect Ledger
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 