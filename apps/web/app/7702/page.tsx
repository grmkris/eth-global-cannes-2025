'use client'

import { useState } from 'react'
import { useAccount, useChainId, useChains } from 'wagmi'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Separator } from '@workspace/ui/components/separator'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { type Call, type WalletType, createSnojReceiveCall, createSnojTestCall } from './_lib/eip-7702'
import { 
  useCreatePasskeyDelegation, 
  useExecuteWithPasskey, 
  usePasskeyDelegation, 
  useClearDelegation,
  useGetWalletClient,
  useGenerateLocalAccount,
  useStoredLocalAccount,
  useLocalAccountBalance,
  useLocalAccountChainId
} from './_lib/eip-7702-hooks'
import { LocalAccountNetworkSwitch } from './_components/LocalAccountNetworkSwitch'
import { encodeFunctionData, type Hex } from 'viem'
import { CheckCircle2, AlertCircle, Loader2, Key, Wallet, Shield, HardDrive, Network } from 'lucide-react'
import { MessageSquare } from 'lucide-react'
import { passkeyDelegationAbi } from './_lib/webauthn_delegation_abi'
import { LedgerConnect } from './components/LedgerConnect'
import { CopyableAddress } from './_components/CopyableAddress'
import { IthacaDemo } from './_lib/ithaca/ithaca'
import { LedgerSigningDemo } from './components/LedgerSigningDemo'
import { LedgerAuthDemo } from './components/LedgerAuthDemo'
import { LedgerFullDemo } from './components/LedgerFullDemo'

// Replace with your deployed delegation contract address
const CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890' as const
import { getNetworkConfig, getContractAddress } from './_lib/network-config'

export default function EIP7702Page() {
  const { address: connectedAddress, isConnected } = useAccount()
  const wagmiChainId = useChainId()
  const { chainId: localChainId, setChainId: setLocalChainId } = useLocalAccountChainId()
  const chains = useChains()
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string | React.ReactNode }>>([])
  const [privateKey, setPrivateKey] = useState<string>('')
  const [selectedWalletType, setSelectedWalletType] = useState<WalletType>('metamask')

  // Get delegation status first to determine wallet type
  const { data: delegation } = usePasskeyDelegation()

  // Determine which chain ID to use based on context
  const isLocalAccountMode = selectedWalletType === 'local' || delegation?.walletType === 'local'
  const chainId = isLocalAccountMode ? localChainId : wagmiChainId
  const currentChain = chains.find(chain => chain.id === chainId)

  const addLog = (message: string | React.ReactNode) => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      message: message
    }])
  }

  // Get network-specific contract address
  const networkConfig = getNetworkConfig(chainId)
  const contractAddress = networkConfig?.webAuthnDelegationAddress
  const isNetworkSupported = !!contractAddress

  // React Query hooks
  const { walletClient: currentWalletClient } = useGetWalletClient({ chainId: isLocalAccountMode ? chainId : undefined })
  const { data: storedLocalAccount } = useStoredLocalAccount(isLocalAccountMode ? chainId : undefined)
  const { data: localBalance } = useLocalAccountBalance(isLocalAccountMode ? chainId : undefined)
  const generateLocalAccountMutation = useGenerateLocalAccount({
    addLog,
    chainId: isLocalAccountMode ? chainId : undefined
  })
  const createDelegationMutation = useCreatePasskeyDelegation({
    contractAddress: contractAddress || '0x0000000000000000000000000000000000000000',
    addLog,
    chainId: isLocalAccountMode ? chainId : undefined
  })
  const executeWithPasskeyMutation = useExecuteWithPasskey({ addLog })
  const clearDelegationMutation = useClearDelegation(isLocalAccountMode ? chainId : undefined)

  const handleCreateDelegation = async (walletType: WalletType) => {
    try {
      if (walletType === 'cold' && !privateKey) {
        addLog('Please enter a private key for cold wallet')
        return
      }
      
      await createDelegationMutation.mutateAsync({ 
        walletType,
        privateKey: walletType === 'cold' ? privateKey as Hex : undefined
      })
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  if (!contractAddress) {
    return <div>No contract address found for network {currentChain?.name}</div>
  }

  const handleExecuteWithPasskey = async () => {
    if (!delegation) return
    
    try {
      // Get the snoj contract address
      const snojContractAddress = getContractAddress(chainId, 'snojContractAddress')
      if (!snojContractAddress) {
        addLog('Snoj contract not configured for this network')
        return
      }
      
      // Create a test call to the snoj contract with a random number
      const testNumber = BigInt(Math.floor(Math.random() * 1000))
      const snojTestCall1 = createSnojReceiveCall(snojContractAddress, 110000n)
      const snojTestCall2 = createSnojReceiveCall(snojContractAddress, 120000n)
      const snojTestCall3 = createSnojReceiveCall(snojContractAddress, 130000n)
      const snojTestCall4 = createSnojReceiveCall(snojContractAddress, 140000n)
      
      addLog(`Calling snoj contract test function with number: ${testNumber}`)
      
      if (!currentWalletClient) {
        addLog('No wallet client available')
        return
      }

      await executeWithPasskeyMutation.mutateAsync({
        calls: [snojTestCall1, snojTestCall2, snojTestCall3, snojTestCall4],
        walletClient: currentWalletClient
      })
    } catch (error) {
      // Error is handled by the mutation
    }
  }
  
  const handleClearDelegation = async () => {
    try {
      await clearDelegationMutation.mutateAsync({
        clearLocalStorage: true,
      })
      setLogs([])
      setPrivateKey('')
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">EIP-7702 Delegation with Passkeys</h1>
            <p className="text-muted-foreground">
              Delegate any type of EOA (MetaMask, Local, or Cold Wallet) to a passkey for secure transactions
            </p>
          </div>
        </div>

        <Tabs defaultValue="eip7702" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="eip7702">EIP-7702 Demo</TabsTrigger>
            <TabsTrigger value="ithaca">Ithaca Demo</TabsTrigger>
          </TabsList>

          <TabsContent value="eip7702" className="space-y-6 mt-6">
            <div className="flex items-center justify-end">
              {isLocalAccountMode ? (
                <LocalAccountNetworkSwitch
                  currentChainId={chainId}
                  onNetworkChange={(newChainId) => {
                    setLocalChainId(newChainId)
                    // Clear delegation when switching networks
                    if (delegation) {
                      clearDelegationMutation.mutate({ clearLocalStorage: false })
                    }
                  }}
                />
              ) : (
                <appkit-network-button />
              )}
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
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">EIP-7702 Support:</span>
                  <Badge variant={isNetworkSupported ? "default" : "destructive"}>
                    {isNetworkSupported ? 'Supported' : 'Not Supported'}
                  </Badge>
                </div>
                {isNetworkSupported && contractAddress && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Contract:</span>
                    <CopyableAddress address={contractAddress} chainId={chainId} />
                  </div>
                )}
              </>
            )}
            {!isNetworkSupported && currentChain && (
              <div className="space-y-2 mt-2">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This network is not configured. Please switch to a supported network.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                    Zircuit Garfield Testnet
                  </Badge>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                    Ethereum Sepolia
                  </Badge>
                </div>
              </div>
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

        {/* EIP-7702 Wallet Selection */}
        {!delegation ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Select Wallet Type for Delegation
              </CardTitle>
              <CardDescription>
                Choose how you want to create your EOA for passkey delegation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedWalletType} onValueChange={(v) => setSelectedWalletType(v as WalletType)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="metamask">
                    <Wallet className="h-4 w-4 mr-2" />
                    MetaMask
                  </TabsTrigger>
                  <TabsTrigger value="local">
                    <HardDrive className="h-4 w-4 mr-2" />
                    Local Account
                  </TabsTrigger>
                  <TabsTrigger value="cold">
                    <Shield className="h-4 w-4 mr-2" />
                    Cold Wallet
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="metamask" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Use your connected MetaMask wallet to create a passkey delegation.
                  </p>
                  {isConnected ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span>Connected: <CopyableAddress address={connectedAddress || ''} chainId={chainId} /></span>
                      </div>
                      <Button 
                        onClick={() => handleCreateDelegation('metamask')}
                        disabled={createDelegationMutation.isPending || !isNetworkSupported}
                        className="w-full"
                      >
                        {createDelegationMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Delegation...
                          </>
                        ) : (
                          'Create Passkey Delegation'
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Please connect your MetaMask wallet first
                        </AlertDescription>
                      </Alert>
                      <appkit-button />
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="local" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Generate a new EOA in-memory. The private key will be created randomly for demo purposes.
                  </p>
                  <Alert>
                    <Network className="h-4 w-4" />
                    <AlertDescription>
                      With local accounts, you can switch networks using the dropdown in the top right corner.
                    </AlertDescription>
                  </Alert>

                  {!storedLocalAccount ? (
                    <Button 
                      onClick={() => generateLocalAccountMutation.mutate()}
                      disabled={generateLocalAccountMutation.isPending}
                      className="w-full"
                    >
                      {generateLocalAccountMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating EOA...
                        </>
                      ) : (
                        'Step 1: Generate Local EOA'
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-lg border p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">EOA Address:</span>
                          <CopyableAddress address={storedLocalAccount.address} chainId={chainId} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Balance:</span>
                          <Badge variant={localBalance && localBalance.value > 0n ? "default" : "destructive"}>
                            {localBalance ? `${(Number(localBalance.value) / 1e18).toFixed(6)} ${localBalance.symbol}` : 'Loading...'}
                          </Badge>
                        </div>
                      </div>
                      
                      {localBalance && localBalance.value === 0n && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Your EOA has no balance. Please fund it with some ETH to pay for gas fees before creating a delegation.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <Button 
                        onClick={() => handleCreateDelegation('local')}
                        disabled={createDelegationMutation.isPending || !localBalance || localBalance.value === 0n || !isNetworkSupported}
                        className="w-full"
                      >
                        {createDelegationMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Delegation...
                          </>
                        ) : (
                          'Step 2: Create Passkey Delegation'
                        )}
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="cold" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Connect your Ledger hardware wallet or import an existing private key to create a passkey delegation.
                  </p>

                  {/* Ledger Connection */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Option 1: Connect Hardware Wallet</h4>
                    <LedgerConnect />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  {/* Private Key Input */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Option 2: Import Private Key</h4>
                    <div className="space-y-2">
                      <Label htmlFor="privateKey">Private Key</Label>
                      <Input
                        id="privateKey"
                        type="password"
                        placeholder="0x..."
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your private key starting with 0x (64 hex characters)
                      </p>
                    </div>

                    {privateKey && privateKey.length === 66 && privateKey.startsWith('0x') && (
                      <div className="space-y-4">
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Make sure your wallet has sufficient balance to pay for gas fees before creating a delegation.
                          </AlertDescription>
                        </Alert>

                        <Button
                          onClick={() => handleCreateDelegation('cold')}
                          disabled={createDelegationMutation.isPending || !isNetworkSupported}
                          className="w-full"
                        >
                          {createDelegationMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating Delegation...
                            </>
                          ) : (
                            'Create Passkey Delegation'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Passkey Delegation Active
                  </CardTitle>
                  <CardDescription>
                    Your {delegation.walletType} wallet has been delegated to a passkey
                  </CardDescription>
                </div>
                {delegation.walletType === 'local' ? (
                  <LocalAccountNetworkSwitch
                    currentChainId={chainId}
                    onNetworkChange={(newChainId) => {
                      setLocalChainId(newChainId)
                      // Clear delegation when switching networks
                      clearDelegationMutation.mutate({ clearLocalStorage: false })
                    }}
                  />
                ) : (
                  <appkit-network-button />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Wallet Type:</span>
                  <Badge>{delegation.walletType}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Delegated EOA:</span>
                  <CopyableAddress
                    address={currentWalletClient?.account?.address || storedLocalAccount?.address || connectedAddress || 'Unknown'}
                    chainId={chainId}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Passkey ID:</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {delegation.passkeyId.substring(0, 16)}...
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Delegation Contract:</span>
                  <CopyableAddress address={contractAddress} chainId={chainId} />
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
                    onClick={() => handleClearDelegation()}
                    disabled={clearDelegationMutation.isPending}
                    variant="outline"
                  >
                    Clear
                  </Button>
                </div>
              </div>
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
            <p>1. Choose your wallet type: MetaMask, Local (in-memory), or Cold Wallet</p>
            <p>2. Create a passkey and delegate your EOA to a smart contract</p>
            <p>3. The delegation allows the contract to execute on behalf of your EOA</p>
            <p>4. Use your passkey to authenticate and execute transactions</p>
            <p>5. Your EOA remains in control but can be operated via passkey</p>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="ithaca" className="mt-6">
          <IthacaDemo />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}