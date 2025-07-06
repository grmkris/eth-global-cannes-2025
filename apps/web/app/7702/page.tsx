'use client'

import { useState } from 'react'
import { useChainId, useChains } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Shield, Network, MessageSquare } from 'lucide-react'
import { LedgerConnect } from '../_lib/ledger/components/LedgerConnect'
import { LedgerSigningDemo } from '../_lib/ledger/components/LedgerSigningDemo'
import { LedgerAuthDemo } from '../_lib/ledger/components/LedgerAuthDemo'
import { LedgerFullDemo } from '../_lib/ledger/components/LedgerFullDemo'

export default function EIP7702Page() {
  const chainId = useChainId()
  const chains = useChains()
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string | React.ReactNode }>>([])

  const currentChain = chains.find(chain => chain.id === chainId)

  const addLog = (message: string | React.ReactNode) => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      message: message
    }])
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Ledger Hardware Wallet Demo</h1>
            <p className="text-muted-foreground">
              Connect and interact with your Ledger hardware wallet for secure transactions
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-end">
            <appkit-network-button />
          </div>

          {/* Network Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Network Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Network:</span>
                <Badge variant={currentChain ? "default" : "destructive"}>
                  {currentChain ? currentChain.name : 'Not Connected'}
                </Badge>
              </div>
              {currentChain && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Chain ID:</span>
                    <Badge variant="outline">{currentChain.id}</Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Ledger Connection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Hardware Wallet Connection
              </CardTitle>
              <CardDescription>
                Connect your Ledger hardware wallet for additional security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LedgerConnect />
            </CardContent>
          </Card>

          {/* Ledger Signing Demo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Ledger Signing Demo
              </CardTitle>
              <CardDescription>
                Test message signing, typed data signing, and transaction signing with your Ledger device
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LedgerSigningDemo />
              <LedgerAuthDemo />
              <div className="mt-6">
                <LedgerFullDemo />
              </div>
            </CardContent>
          </Card>

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
                      <div key={index} className="text-sm font-mono">
                        <span className="text-muted-foreground">[{log.timestamp}]</span>{' '}
                        {typeof log.message === 'string' ? log.message : log.message}
                      </div>
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
              <p>1. Connect your Ledger hardware wallet using WebHID API</p>
              <p>2. Test message signing and typed data signing capabilities</p>
              <p>3. Create and sign transactions with your Ledger device</p>
              <p>4. All signing operations require physical confirmation on the device</p>
              <p>5. Your private keys never leave the hardware wallet</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}