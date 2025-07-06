'use client'

import { useState } from 'react'
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
	CheckCircle2, AlertCircle, Loader2, Key, Shield,
	Network, MessageSquare, Zap, DollarSign
} from 'lucide-react'

// Import new hooks from _lib
import {
	useCreatePasskeyDelegation,
	useExecuteWithPasskey,
	useGetDelegationStatus,
	useClearDelegation
} from './_lib/7702-hooks'
import {
	useEoaWalletClient,
	useClearEoa,
	useActiveChain,
	useSetActiveChain,
	useETHBalance
} from './_lib/eoa-hooks'
import {
	useCircle7702Transfer,
	useUSDCBalance
} from './_lib/circle-hooks'
import { getNetworkConfig, getContractAddress } from './_lib/network-config'
import { CopyableAddress } from './_lib/components/CopyableAddress'
import { LocalAccountNetworkSwitch } from './_lib/components/LocalAccountNetworkSwitch'
import { http, createPublicClient, type Address } from 'viem'
import { type Call } from './_lib/7702'
import { sepolia } from 'viem/chains'
import { LedgerAuthDemo } from './7702/components/LedgerAuthDemo'
import { LedgerFullDemo } from './7702/components/LedgerFullDemo'

export default function Page() {
	const [logs, setLogs] = useState<Array<{ timestamp: string; message: string | React.ReactNode }>>([])
	const [recipientAddress, setRecipientAddress] = useState<string>('')
	const [usdcAmount, setUsdcAmount] = useState<string>('10')

	// Hooks
	const activeChain = useActiveChain()
	const eoaWalletClient = useEoaWalletClient()
	const clearEoa = useClearEoa()

	// Get delegation status
	const { data: delegation } = useGetDelegationStatus()

	// Determine current wallet client and chain
	const chainId = activeChain.data?.id
	const currentWalletClient = eoaWalletClient.data

	const publicClient = createPublicClient({
		chain: activeChain.data ?? sepolia,
		transport: http()
	})

	const { data: usdcBalance } = useUSDCBalance({
		walletClient: currentWalletClient,
		publicClient: publicClient
	})

	const { data: ethBalance } = useETHBalance({
		address: currentWalletClient?.account?.address,
		publicClient: publicClient
	})

	// Mutations
	const createDelegationMutation = useCreatePasskeyDelegation({
		addLog: (message) => {
			setLogs(prev => [...prev, {
				timestamp: new Date().toLocaleTimeString(),
				message
			}])
		}
	})
	const executeWithPasskeyMutation = useExecuteWithPasskey({
		addLog: (message) => {
			setLogs(prev => [...prev, {
				timestamp: new Date().toLocaleTimeString(),
				message
			}])
		}
	})
	const clearDelegationMutation = useClearDelegation()
	const circle7702TransferMutation = useCircle7702Transfer()

	// Get network config
	const networkConfig = getNetworkConfig(chainId ?? 11155111)
	const contractAddress = networkConfig?.webAuthnDelegationAddress
	const isNetworkSupported = !!contractAddress

	const addLog = (message: string | React.ReactNode) => {
		setLogs(prev => [...prev, {
			timestamp: new Date().toLocaleTimeString(),
			message
		}])
	}

	const handleCreateDelegation = async () => {
		try {
			await createDelegationMutation.mutateAsync()

			addLog('Passkey delegation created successfully!')
		} catch (error) {
			addLog(`Error creating delegation: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}

	const handleExecuteWithPasskey = async () => {
		if (!delegation) {
			addLog('No active delegation found')
			return
		}

		try {
			// Get the snoj contract address for demo
			const snojContractAddress = getContractAddress(chainId ?? 11155111, 'snojContractAddress')
			if (!snojContractAddress) {
				addLog('Demo contract not configured for this network')
				return
			}

			// Create test calls (simplified for demo)
			const calls: Call[] = [{
				to: snojContractAddress,
				value: 0n,
				data: '0x' // Add proper function call data here
			}]

			await executeWithPasskeyMutation.mutateAsync({
				calls: calls
			})
			addLog('Transaction executed successfully!')
		} catch (error) {
			addLog(`Error executing transaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}

	const handleCircleTransfer = async () => {
		if (!publicClient || !currentWalletClient || !recipientAddress || !usdcAmount) {
			console.log('Missing required parameters for transfer', publicClient, currentWalletClient, recipientAddress, usdcAmount)
			addLog('Missing required parameters for transfer')
			return
		}

		try {
			addLog('Initiating Circle paymaster USDC transfer...')
			await circle7702TransferMutation.mutateAsync({
				walletClient: currentWalletClient,
				publicClient,
				amount: BigInt(usdcAmount),
				recipientAddress: recipientAddress as Address
			})
			addLog('USDC transfer completed successfully!')
		} catch (error) {
			addLog(`Error during transfer: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}

	const handleClearDelegation = async () => {
		try {
			await clearDelegationMutation.mutateAsync()
			clearEoa.mutate()
			setLogs([])
			addLog('Delegation cleared successfully')
		} catch (error) {
			addLog(`Error clearing delegation: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}

	return (
		<div className="container mx-auto py-8 px-4 max-w-6xl">
			<div className="space-y-6">
				{/* Header */}
				<div className="text-center">
					<h1 className="text-4xl font-bold mb-4">Cross-Chain USDC Smart Account</h1>
					<p className="text-muted-foreground text-lg max-w-2xl mx-auto">
						A powerful passkey-based smart account wallet with multi-chain support,
						hardware wallet integration, and gasless USDC transfers
					</p>
				</div>

				{/* Network Status */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2">
								<Network className="h-5 w-5" />
								Network & Wallet Status
							</CardTitle>
							<LocalAccountNetworkSwitch />
						</div>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">Network:</span>
									<Badge variant="default">
										{activeChain.data?.name}
									</Badge>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">Chain ID:</span>
									<Badge variant="outline">{chainId}</Badge>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">EIP-7702 Support:</span>
									<Badge variant={isNetworkSupported ? "default" : "destructive"}>
										{isNetworkSupported ? 'Supported' : 'Not Supported'}
									</Badge>
								</div>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">Wallet:</span>
									<Badge variant={currentWalletClient ? "default" : "secondary"}>
										{currentWalletClient ? 'Connected' : 'Not Connected'}
									</Badge>
								</div>
								{currentWalletClient && (
									<>
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium">Address:</span>
											<CopyableAddress
												address={currentWalletClient.account?.address || ''}
												chainId={chainId}
											/>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium">ETH Balance:</span>
											<Badge variant="outline">
												{ethBalance ? `${(Number(ethBalance) / 1e18).toFixed(4)} ETH` : 'Loading...'}
											</Badge>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium">USDC Balance:</span>
											<Badge variant="outline">
												{usdcBalance ? `${(Number(usdcBalance) / 1e6).toFixed(2)} USDC` : 'Loading...'}
											</Badge>
										</div>
									</>
								)}
							</div>
						</div>
					</CardContent>
				</Card>

				<Tabs defaultValue="wallet" className="w-full">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="wallet">
							<Key className="h-4 w-4 mr-2" />
							Wallet Setup
						</TabsTrigger>
						<TabsTrigger value="transfer">
							<DollarSign className="h-4 w-4 mr-2" />
							USDC Transfers
						</TabsTrigger>
						<TabsTrigger value="hardware">
							<Shield className="h-4 w-4 mr-2" />
							Hardware Wallet
						</TabsTrigger>
					</TabsList>

					{/* Wallet Setup Tab */}
					<TabsContent value="wallet" className="space-y-6 mt-6">
						{!delegation ? (
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Key className="h-5 w-5" />
										Create Passkey Delegation
									</CardTitle>
									<CardDescription>
										Create your smart account with passkey delegation using a local EOA
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<Alert>
										<Network className="h-4 w-4" />
										<AlertDescription>
											Your local EOA is automatically generated and stored securely. You can switch networks using the dropdown above.
										</AlertDescription>
									</Alert>

									{currentWalletClient ? (
										<div className="space-y-4">
											<div className="rounded-lg border p-4 space-y-2">
												<div className="flex items-center justify-between">
													<span className="text-sm font-medium">EOA Address:</span>
													<CopyableAddress
														address={currentWalletClient.account?.address || ''}
														chainId={chainId}
													/>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-sm font-medium">Status:</span>
													<Badge variant="default">
														Ready
													</Badge>
												</div>
											</div>

											<Button
												onClick={handleCreateDelegation}
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
										<p className="text-sm text-muted-foreground text-center py-8">Loading local account...</p>
									)}
								</CardContent>
							</Card>
						) : (
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<CheckCircle2 className="h-5 w-5 text-green-500" />
										Passkey Delegation Active
									</CardTitle>
									<CardDescription>
										Your smart account is ready for secure transactions
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium">EOA Address:</span>
											<CopyableAddress
												address={currentWalletClient?.account?.address || ''}
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
											<CopyableAddress address={contractAddress || ''} chainId={chainId} />
										</div>
									</div>

									<Separator />

									<div className="space-y-2">
										<h4 className="font-medium">Test Transaction Execution</h4>
										<p className="text-sm text-muted-foreground">
											Execute a test transaction using your passkey
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
													'Execute Test Transaction'
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
								</CardContent>
							</Card>
						)}
					</TabsContent>

					{/* USDC Transfers Tab */}
					<TabsContent value="transfer" className="space-y-6 mt-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Zap className="h-5 w-5" />
									Gasless USDC Transfers
								</CardTitle>
								<CardDescription>
									Transfer USDC without paying gas fees using Circle's paymaster
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{!delegation ? (
									<Alert>
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>
											Please create a passkey delegation first to enable USDC transfers
										</AlertDescription>
									</Alert>
								) : (
									<>
										<div className="space-y-2">
											<Label htmlFor="recipient">Recipient Address</Label>
											<Input
												id="recipient"
												placeholder="0x..."
												value={recipientAddress}
												onChange={(e) => setRecipientAddress(e.target.value)}
											/>
										</div>

										<div className="space-y-2">
											<Label htmlFor="amount">Amount (USDC)</Label>
											<Input
												id="amount"
												type="number"
												placeholder="10"
												value={usdcAmount}
												onChange={(e) => setUsdcAmount(e.target.value)}
											/>
											<p className="text-xs text-muted-foreground">
												Available: {usdcBalance ? `${(Number(usdcBalance) / 1e6).toFixed(2)} USDC` : 'Loading...'}
											</p>
										</div>

										<Button
											onClick={handleCircleTransfer}
											disabled={
												circle7702TransferMutation.isPending ||
												!recipientAddress ||
												!usdcAmount ||
												parseFloat(usdcAmount) <= 0
											}
											className="w-full"
										>
											{circle7702TransferMutation.isPending ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Transferring...
												</>
											) : (
												'Transfer USDC'
											)}
										</Button>
									</>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					{/* Hardware Wallet Tab */}
					<TabsContent value="hardware" className="space-y-6 mt-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Shield className="h-5 w-5" />
									Hardware Wallet Integration
								</CardTitle>
								<CardDescription>
									Connect and manage your Ledger hardware wallet
								</CardDescription>
							</CardHeader>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<MessageSquare className="h-5 w-5" />
									Ledger Authentication
								</CardTitle>
								<CardDescription>
									Test authentication and signing with your Ledger device
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<LedgerAuthDemo />
								<Separator />
								<LedgerFullDemo />
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>

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
						<CardTitle>Features</CardTitle>
					</CardHeader>
					<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						<div className="space-y-2">
							<h4 className="font-medium flex items-center gap-2">
								<Key className="h-4 w-4" />
								Passkey Authentication
							</h4>
							<p className="text-muted-foreground">
								Secure your wallet with biometric authentication using WebAuthn passkeys
							</p>
						</div>
						<div className="space-y-2">
							<h4 className="font-medium flex items-center gap-2">
								<Network className="h-4 w-4" />
								Multi-Chain Support
							</h4>
							<p className="text-muted-foreground">
								Seamlessly switch between supported networks with unified account management
							</p>
						</div>
						<div className="space-y-2">
							<h4 className="font-medium flex items-center gap-2">
								<Zap className="h-4 w-4" />
								Gasless Transactions
							</h4>
							<p className="text-muted-foreground">
								Transfer USDC without paying gas fees using Circle's paymaster integration
							</p>
						</div>
						<div className="space-y-2">
							<h4 className="font-medium flex items-center gap-2">
								<Shield className="h-4 w-4" />
								Hardware Wallet Support
							</h4>
							<p className="text-muted-foreground">
								Connect Ledger devices for enhanced security and cold storage capabilities
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}