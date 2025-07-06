'use client'

import React from 'react'
import { useLedger } from '../hooks/useLedger'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Loader2, Usb, CheckCircle, XCircle } from 'lucide-react' 
import { networkConfigs } from '../../network-config'
import { sepolia } from 'viem/chains'
import { useMutation } from '@tanstack/react-query'

export function LedgerConnect() {
  const { isConnected, isDiscovering, error, connect, disconnect } = useLedger()

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Usb className="h-5 w-5" />
          Ledger Device
        </CardTitle>
        <CardDescription>
          Connect your Ledger hardware wallet to interact with the application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isConnected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Connected to Ledger</span>
            </div>
            <Button 
              onClick={disconnect} 
              variant="outline" 
              className="w-full"
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Button 
            onClick={connect} 
            disabled={isDiscovering}
            className="w-full"
          >
            {isDiscovering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Discovering Devices...
              </>
            ) : (
              <>
                <Usb className="mr-2 h-4 w-4" />
                Connect Ledger
              </>
            )}
          </Button>
        )}

        <div className="text-xs text-muted-foreground">
          <p>• Make sure your Ledger device is connected via USB</p>
          <p>• Unlock your device and open the appropriate app</p>
          <p>• Use Chrome or Edge for best compatibility</p>
        </div>
      </CardContent>
    </Card>
  )
} 