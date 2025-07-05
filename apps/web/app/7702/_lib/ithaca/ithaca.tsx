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
import { type Call, type WalletType, createMintCall, createTransferCall, createMintForEtherCall, createBurnForEtherCall } from './ithaca-actions'
import { 
  useCreatePasskeyDelegation, 
  useExecuteWithPasskey, 
  usePasskeyDelegation, 
  useClearDelegation,
  useGetWalletClient,
  useGenerateLocalAccount,
  useStoredLocalAccount,
  useLocalAccountBalance,
  useLocalAccountChainId,
  useIthacaTokenBalance,
  useExecuteIthacaOperation
} from './ithaca-hooks'
import { LocalAccountNetworkSwitch } from '../../_components/LocalAccountNetworkSwitch'
import { type Hex, parseEther, formatUnits } from 'viem'
import { CheckCircle2, AlertCircle, Loader2, Key, Wallet, Shield, HardDrive, Network, Coins, Send, Flame, ArrowUpDown, Copy, Check } from 'lucide-react'
import { CopyableAddress } from '../../_components/CopyableAddress'
import { getNetworkConfig, getContractAddress } from '../network-config'

export function IthacaDemo() {
  const { address: connectedAddress, isConnected } = useAccount()
  const wagmiChainId = useChainId()
  const { chainId: localChainId, setChainId: setLocalChainId } = useLocalAccountChainId()
  const chains = useChains()
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string | React.ReactNode }>>([])
  const [privateKey, setPrivateKey] = useState<string>('')
  const [selectedWalletType, setSelectedWalletType] = useState<WalletType>('metamask')
  const [copied, setCopied] = useState(false)
  
  // ERC20 operation states
  const [mintAmount, setMintAmount] = useState<string>('1000')
  const [transferTo, setTransferTo] = useState<string>('')
  const [transferAmount, setTransferAmount] = useState<string>('100')
  const [burnAmount, setBurnAmount] = useState<string>('100')
  const [etherAmount, setEtherAmount] = useState<string>('0.001')

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

  // Get network-specific contract addresses
  const networkConfig = getNetworkConfig(chainId)
  const delegationContractAddress = networkConfig?.experimentDelegationAddress
  const erc20ContractAddress = networkConfig?.experimentERC20Address
  const isNetworkSupported = !!delegationContractAddress && !!erc20ContractAddress

  // React Query hooks
  const { walletClient: currentWalletClient } = useGetWalletClient({ chainId: isLocalAccountMode ? chainId : undefined })
  const { data: storedLocalAccount } = useStoredLocalAccount(isLocalAccountMode ? chainId : undefined)
  const { data: localBalance } = useLocalAccountBalance(isLocalAccountMode ? chainId : undefined)
  const generateLocalAccountMutation = useGenerateLocalAccount({
    addLog,
    chainId: isLocalAccountMode ? chainId : undefined
  })
  const createDelegationMutation = useCreatePasskeyDelegation({
    contractAddress: delegationContractAddress || '0x0000000000000000000000000000000000000000',
    addLog,
    chainId: isLocalAccountMode ? chainId : undefined
  })
  const executeWithPasskeyMutation = useExecuteWithPasskey({ addLog })
  const executeIthacaOperation = useExecuteIthacaOperation({ 
    addLog, 
    erc20ContractAddress: erc20ContractAddress || '0x0000000000000000000000000000000000000000'
  })
  const clearDelegationMutation = useClearDelegation(isLocalAccountMode ? chainId : undefined)
  
  // Get current wallet address
  const currentWalletAddress = currentWalletClient?.account?.address || storedLocalAccount?.address || connectedAddress
  
  // Get ERC20 balance
  const { data: tokenBalance } = useIthacaTokenBalance({ 
    address: currentWalletAddress,
    chainId 
  })

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

  const handleMint = async () => {
    if (!delegation || !currentWalletClient || !erc20ContractAddress || !currentWalletAddress) return
    
    try {
      const amount = parseEther(mintAmount)
      const mintCall = createMintCall(erc20ContractAddress, currentWalletAddress, amount)
      
      addLog(`Minting ${mintAmount} EXP tokens to ${currentWalletAddress.slice(0, 8)}...`)
      
      await executeIthacaOperation.mutateAsync({ 
        calls: [mintCall],
        walletClient: currentWalletClient
      })
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const handleMintForEther = async () => {
    if (!delegation || !currentWalletClient || !erc20ContractAddress) return
    
    try {
      const amount = parseEther(etherAmount)
      const mintForEtherCall = createMintForEtherCall(erc20ContractAddress, amount)
      
      addLog(`Minting EXP tokens for ${etherAmount} ETH`)
      
      await executeIthacaOperation.mutateAsync({ 
        calls: [mintForEtherCall],
        walletClient: currentWalletClient
      })
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const handleTransfer = async () => {
    if (!delegation || !currentWalletClient || !erc20ContractAddress || !transferTo) return
    
    try {
      const amount = parseEther(transferAmount)
      const transferCall = createTransferCall(erc20ContractAddress, transferTo as Hex, amount)
      
      addLog(`Transferring ${transferAmount} EXP tokens to ${transferTo.slice(0, 8)}...`)
      
      await executeIthacaOperation.mutateAsync({ 
        calls: [transferCall],
        walletClient: currentWalletClient
      })
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const handleBurnForEther = async () => {
    if (!delegation || !currentWalletClient || !erc20ContractAddress) return
    
    try {
      const amount = parseEther(burnAmount)
      const burnCall = createBurnForEtherCall(erc20ContractAddress, amount)
      
      addLog(`Burning ${burnAmount} EXP tokens for ETH`)
      
      await executeIthacaOperation.mutateAsync({ 
        calls: [burnCall],
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

  if (!delegationContractAddress || !erc20ContractAddress) {
    return <div>No Ithaca contracts found for network {currentChain?.name}</div>
  }

  return (
    <div className="space-y-6">
      {/* Network Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Ithaca Network Information
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
                <span className="text-sm font-medium">Ithaca Support:</span>
                <Badge variant={isNetworkSupported ? "default" : "destructive"}>
                  {isNetworkSupported ? 'Supported' : 'Not Supported'}
                </Badge>
              </div>
              {isNetworkSupported && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Delegation Contract:</span>
                    <CopyableAddress address={delegationContractAddress} chainId={chainId} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">ERC20 Contract:</span>
                    <CopyableAddress address={erc20ContractAddress} chainId={chainId} />
                  </div>
                </>
              )}
            </>
          )}
          {!isNetworkSupported && currentChain && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ithaca contracts are not configured for this network. Please switch to Ethereum Sepolia.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Wallet Selection or Active Delegation */}
      {!delegation ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Select Wallet Type for Ithaca Delegation
                </CardTitle>
                <CardDescription>
                  Choose how you want to create your EOA for Ithaca passkey delegation
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isLocalAccountMode ? (
                  <LocalAccountNetworkSwitch
                    currentChainId={chainId}
                    onNetworkChange={(newChainId) => {
                      setLocalChainId(newChainId)
                    }}
                  />
                ) : (
                  <appkit-network-button />
                )}
              </div>
            </div>
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
                  Use your connected MetaMask wallet to create an Ithaca passkey delegation.
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
                        'Create Ithaca Passkey Delegation'
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
                  Generate a new EOA in-memory for Ithaca operations.
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
                          Your EOA has no balance. Please fund it with some ETH to pay for gas fees.
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
                        'Step 2: Create Ithaca Passkey Delegation'
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="cold" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Import an existing private key to create an Ithaca passkey delegation.
                </p>
                
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
                        Make sure your wallet has sufficient balance to pay for gas fees.
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
                        'Create Ithaca Passkey Delegation'
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Delegation Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Ithaca Passkey Delegation Active
                  </CardTitle>
                  <CardDescription>
                    Your {delegation.walletType} wallet is delegated to Ithaca contracts
                  </CardDescription>
                </div>
                {delegation.walletType === 'local' ? (
                  <LocalAccountNetworkSwitch
                    currentChainId={chainId}
                    onNetworkChange={(newChainId) => {
                      setLocalChainId(newChainId)
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
                    address={currentWalletAddress || 'Unknown'} 
                    chainId={chainId} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Key Index:</span>
                  <Badge variant="outline">{delegation.keyIndex ?? 'N/A'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">EXP Token Balance:</span>
                  <Badge variant="default">
                    <Coins className="h-3 w-3 mr-1" />
                    {tokenBalance ? formatUnits(tokenBalance as bigint, 18) : '0'} EXP
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={() => handleClearDelegation()}
                  disabled={clearDelegationMutation.isPending}
                  variant="outline"
                  size="sm"
                >
                  Clear Delegation
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ERC20 Operations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                ERC20 Token Operations
              </CardTitle>
              <CardDescription>
                Execute ERC20 operations using your passkey
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mint Tokens */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Mint Tokens
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Amount"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleMint}
                    disabled={executeIthacaOperation.isPending}
                  >
                    {executeIthacaOperation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Mint'
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Mint for Ether */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Mint for Ether
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="ETH Amount"
                    value={etherAmount}
                    onChange={(e) => setEtherAmount(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleMintForEther}
                    disabled={executeIthacaOperation.isPending}
                  >
                    {executeIthacaOperation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Mint for ETH'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Exchange rate: 1 ETH = 1000 EXP
                </p>
              </div>

              <Separator />

              {/* Transfer Tokens */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Transfer Tokens
                </h4>
                <Input
                  placeholder="Recipient Address (0x...)"
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className="mb-2"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Amount"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleTransfer}
                    disabled={executeIthacaOperation.isPending || !transferTo}
                  >
                    {executeIthacaOperation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Transfer'
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Burn for Ether */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  Burn for Ether
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Amount to Burn"
                    value={burnAmount}
                    onChange={(e) => setBurnAmount(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleBurnForEther}
                    disabled={executeIthacaOperation.isPending}
                    variant="destructive"
                  >
                    {executeIthacaOperation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Burn'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Exchange rate: 1000 EXP = 1 ETH
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Error Display */}
      {(createDelegationMutation.error || executeIthacaOperation.error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {createDelegationMutation.error?.message || executeIthacaOperation.error?.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Activity Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activity Logs</CardTitle>
            {logs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const logText = logs.map(log => {
                    const message = typeof log.message === 'string' 
                      ? log.message 
                      : (log.message as any)?.props?.children || String(log.message)
                    return `[${log.timestamp}] ${message}`
                  }).join('\n')
                  
                  navigator.clipboard.writeText(logText).then(() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  })
                }}
                className="h-8 px-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Logs
                  </>
                )}
              </Button>
            )}
          </div>
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
    </div>
  )
}