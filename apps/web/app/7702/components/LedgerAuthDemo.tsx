'use client'

import React, { useState } from 'react'
import { useLedger } from '../hooks/useLedger'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Loader2, Send, CheckCircle, XCircle, Shield } from 'lucide-react'
import { useChains } from 'wagmi'
import { getContractAddress, networkConfigs } from '@/app/_lib/network-config'
import { createLedgerAuthorization, sendLedgerTransactionWithAuthorization, waitForLedgerTransaction } from '../hooks/ledger-eip-7702'
import { sepolia } from 'viem/chains'
import { type Hex, encodeFunctionData } from 'viem'
import { passkeyDelegationAbi } from '@/app/_lib/abi/webauthn_delegation_abi'

export function LedgerAuthDemo() {
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
  const chains = useChains()
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [authorization, setAuthorization] = useState<any>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSendingTx, setIsSendingTx] = useState(false)
  const [txHash, setTxHash] = useState<Hex | null>(null)
  const [txReceipt, setTxReceipt] = useState<any>(null)



  const handleCreateAuthorization = async () => {
    if (!isConnected) return
    
    try {
      setIsAuthorizing(true)
      setAuthError(null)
      setAuthorization(null)
      
      // Use sepolia for this demo
      const chain = sepolia
      
      // Get the appropriate contract address for the chain
      const contractAddress = networkConfigs[11155111]?.webAuthnDelegationAddress || '0x0000000000000000000000000000000000000000'
      
      const auth = await createLedgerAuthorization({
        contractAddress,
        chain: sepolia,
        nonce: 0,
        chainId: 11155111,
      })

      setAuthorization(auth)
    } catch (err) {
      console.error('Failed to create authorization:', err)
      setAuthError(err instanceof Error ? err.message : 'Failed to create authorization')
    } finally {
      setIsAuthorizing(false)
    }
  }

  const handleSendTransaction = async () => {
    if (!authorization || !accountAddress) return
    
    try {
      setIsSendingTx(true)
      setAuthError(null)
      setTxHash(null)
      setTxReceipt(null)
      
      // Example: Initialize the delegation contract with a dummy public key
      // In a real implementation, you'd use actual passkey public key coordinates
      const dummyPubKeyX = BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
      const dummyPubKeyY = BigInt('0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321')
      
      // Encode the initialize function call
      const initializeData = encodeFunctionData({
        abi: passkeyDelegationAbi,
        functionName: 'initialize',
        args: [accountAddress as Hex, dummyPubKeyX, dummyPubKeyY],
      })
      
      console.log("Sending transaction with authorization:", {
        chain: sepolia,
        authorization,
        to: accountAddress as Hex, // Self-call to initialize
        value: BigInt(0),
        data: initializeData as Hex,
      })
      // Send transaction with authorization
      const hash = await sendLedgerTransactionWithAuthorization({
        chain: sepolia,
        authorization,
        to: accountAddress as Hex, // Self-call to initialize
        value: BigInt(0),
        data: initializeData as Hex,
      })
      
      setTxHash(hash)
      
      // Wait for receipt
      const receipt = await waitForLedgerTransaction({
        chain: sepolia,
        hash,
      })
      
      setTxReceipt(receipt)
    } catch (err) {
      console.error('Failed to send transaction:', err)
      setAuthError(err instanceof Error ? err.message : 'Failed to send transaction')
    } finally {
      setIsSendingTx(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Ledger EIP-7702 Authorization Demo
        </CardTitle>
        <CardDescription>
          Create EIP-7702 delegation authorization with your Ledger device
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {(error || authError) && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error || authError}</AlertDescription>
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



            {/* EIP-7702 Authorization */}
            <div className="space-y-3">
              <div className="text-sm font-medium">EIP-7702 Delegation Authorization</div>
              <div className="p-3 bg-muted rounded-md text-xs">
                <div><strong>Contract:</strong> {
                  getContractAddress(chains[0]?.id || 0, 'webAuthnDelegationAddress') || 
                  'No contract configured'
                }</div>
                <div><strong>Chain:</strong> {chains[0]?.name || 'Unknown'}</div>
                <div><strong>EOA:</strong> {accountAddress || 'Loading...'}</div>
              </div>
              <Button 
                onClick={handleCreateAuthorization}
                disabled={isAuthorizing}
                variant="outline"
                className="w-full"
              >
                {isAuthorizing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="mr-2 h-4 w-4" />
                )}
                Create Authorization
              </Button>
            </div>

            {/* Authorization Result */}
            {authorization && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-green-600">Authorization Created Successfully!</div>
                  <div className="p-3 bg-muted rounded-md space-y-1">
                    <div className="text-xs"><strong>Chain ID:</strong> {authorization.chainId}</div>
                    <div className="text-xs"><strong>Contract:</strong> {authorization.contractAddress}</div>
                    <div className="text-xs"><strong>Nonce:</strong> {authorization.nonce?.toString()}</div>
                    <div className="text-xs"><strong>R:</strong> {authorization.r?.slice(0, 10)}...</div>
                    <div className="text-xs"><strong>S:</strong> {authorization.s?.slice(0, 10)}...</div>
                    <div className="text-xs"><strong>V:</strong> {authorization.v?.toString()}</div>
                  </div>
                </div>
                
                {/* Send Transaction Button */}
                <Button 
                  onClick={handleSendTransaction}
                  disabled={isSendingTx}
                  className="w-full"
                >
                  {isSendingTx ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Transaction...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Transaction with Authorization
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* Transaction Result */}
            {txHash && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Transaction Sent!</div>
                <div className="p-3 bg-muted rounded-md space-y-1">
                  <div className="text-xs break-all">
                    <strong>Hash:</strong> {txHash}
                  </div>
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline"
                  >
                    View on Etherscan →
                  </a>
                  {txReceipt && (
                    <div className="text-xs mt-2">
                      <strong>Status:</strong> {txReceipt.status === 'success' ? '✅ Success' : '❌ Failed'}
                    </div>
                  )}
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