'use client'
import { Cuer } from 'cuer'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@workspace/ui/components/drawer"
import {
	CheckCircle2, AlertCircle, Loader2, Key, Shield,
	Network, MessageSquare, Zap, DollarSign, Send, WalletIcon,
	ArrowDownIcon, Plus, X, QrCode, Copy
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
import { http, createPublicClient, type Address, encodeFunctionData, erc20Abi } from 'viem'
import { type Call } from './_lib/7702'
import { sepolia } from 'viem/chains'
import { LedgerAuthDemo } from './7702/components/LedgerAuthDemo'
import { LedgerFullDemo } from './7702/components/LedgerFullDemo'
import { useStealthAddress } from './_lib/stealh-address-hooks'
import { AvailComponent } from './_lib/avail-comp'

interface Recipient {
	id: string
	address: string
	amount: string
	currency: 'ETH' | 'USDC'
}

export default function Page() {
	const [logs, setLogs] = useState<Array<{ timestamp: string; message: string | React.ReactNode }>>([])
	const [recipientAddress, setRecipientAddress] = useState<string>('')
	const [usdcAmount, setUsdcAmount] = useState<string>('10')
	const [recipients, setRecipients] = useState<Recipient[]>([
		{ id: '1', address: '', amount: '', currency: 'USDC' }
	])

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

			const usdcContractAddress = '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238'
			const encodedTransfer = encodeFunctionData({
				abi: erc20Abi,
				functionName: 'transfer',
				args: ['0x0Cf84F01C311Dc093969136B1814F05B5b3167F6', 10000n]
			})

			// Create test calls (simplified for demo)
			const calls: Call[] = [{
				to: snojContractAddress,
				value: 10000n,
				data: '0x' // Add proper function call data here
			},
			{
				to: snojContractAddress,
				value: 20000n,
				data: '0x' // Add proper function call data here
			},
			{
				to: snojContractAddress,
				value: 30000n,
				data: '0x' // Add proper function call data here
			},
		{
			to: usdcContractAddress,
			value: 0n,
			data: encodedTransfer
		}]

			await executeWithPasskeyMutation.mutateAsync({
				calls: calls
			})
			addLog('Transaction executed successfully!')
		} catch (error) {
			addLog(`Error executing transaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}

	const { data: stealthAddress } = useStealthAddress()

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

	const addRecipient = () => {
		setRecipients([...recipients, {
			id: Date.now().toString(),
			address: '',
			amount: '',
			currency: 'USDC'
		}])
	}

	const removeRecipient = (id: string) => {
		if (recipients.length > 1) {
			setRecipients(recipients.filter(r => r.id !== id))
		}
	}

	const updateRecipient = (id: string, field: keyof Recipient, value: string) => {
		setRecipients(recipients.map(r => 
			r.id === id ? { ...r, [field]: value } : r
		))
	}

	const handleMultiSend = async () => {
		if (!currentWalletClient || !publicClient) {
			addLog('Wallet not connected')
			return
		}

		const validRecipients = recipients.filter(r => r.address && r.amount && parseFloat(r.amount) > 0)
		if (validRecipients.length === 0) {
			addLog('Please add at least one valid recipient')
			return
		}

		try {
			addLog('Processing multi-send transaction...')
			// TODO: Implement actual multi-send logic here
			const calls: Call[] = []
			for (const recipient of validRecipients) {
				addLog(`Sending ${recipient.amount} ${recipient.currency} to ${recipient.address.substring(0, 10)}...`)
				calls.push({
					to: recipient.address as Address,
					value: BigInt(recipient.amount),
					data: '0x'
				})
			}
			await executeWithPasskeyMutation.mutateAsync({
				calls: calls
			})
			addLog('Multi-send completed successfully!')
		} catch (error) {
			addLog(`Error during multi-send: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}

	return (
		<div className="container mx-auto py-8 px-4 max-w-4xl">
			<div className="space-y-6">
				{/* Header with Wallet Balance */}
				<Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
					<CardHeader>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<WalletIcon className="h-6 w-6" />
								<CardTitle className="text-2xl">My Wallet</CardTitle>
							</div>
							<LocalAccountNetworkSwitch />
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						{currentWalletClient ? (
							<>
								<div className="space-y-2">
									<p className="text-sm opacity-90">Total Balance</p>
									<div className="text-4xl font-bold">
										${(
											(ethBalance ? Number(ethBalance) / 1e18 * 3000 : 0) + 
											(usdcBalance ? Number(usdcBalance) / 1e6 : 0)
										).toFixed(2)} USD
									</div>
								</div>
								<div className="grid grid-cols-2 gap-4 pt-4">
									<div className="bg-white/10 rounded-lg p-3">
										<p className="text-sm opacity-90">ETH</p>
										<p className="text-xl font-semibold">
											{ethBalance ? `${(Number(ethBalance) / 1e18).toFixed(4)}` : '0.0000'}
										</p>
									</div>
									<div className="bg-white/10 rounded-lg p-3">
										<p className="text-sm opacity-90">USDC</p>
										<p className="text-xl font-semibold">
											{usdcBalance ? `${(Number(usdcBalance) / 1e6).toFixed(2)}` : '0.00'}
										</p>
									</div>
								</div>
								<div className="pt-2">
									<Drawer>
										<DrawerTrigger asChild>
											<Button className="w-full bg-white text-black hover:bg-gray-100">
												<ArrowDownIcon className="mr-2 h-4 w-4" />
												Receive
											</Button>
										</DrawerTrigger>
										<DrawerContent>
											<DrawerHeader>
												<DrawerTitle>Receive Funds</DrawerTitle>
												<DrawerDescription>
													Send ETH or USDC to this address on {activeChain.data?.name}
												</DrawerDescription>
											</DrawerHeader>
											<div className="px-4 pb-8 space-y-6">
												<Tabs defaultValue="main" className="w-full">
													<TabsList className="grid w-full grid-cols-2">
														<TabsTrigger value="main">Main Address</TabsTrigger>
														<TabsTrigger value="stealth">Stealth Address</TabsTrigger>
													</TabsList>
													<TabsContent value="main" className="space-y-4 mt-4">
														<div className="flex justify-center">
															<div className="w-64 h-64 p-4 rounded-lg">
																<Cuer 
																	arena="https://example.com/logo.png" 
																	value={currentWalletClient.account?.address || ''} 
																	size={240}
																/>
															</div>
														</div>
														<div className="space-y-2">
															<Label className="text-sm text-muted-foreground">Main Wallet Address</Label>
															<div className="flex gap-2">
																<Input
																	value={currentWalletClient.account?.address || ''}
																	readOnly
																	className="font-mono text-xs"
																/>
																<Button
																	size="icon"
																	variant="outline"
																	onClick={() => {
																		navigator.clipboard.writeText(currentWalletClient.account?.address || '')
																		addLog('Main address copied to clipboard')
																	}}
																>
																	<Copy className="h-4 w-4" />
																</Button>
															</div>
														</div>
													</TabsContent>
													<TabsContent value="stealth" className="space-y-4 mt-4">
														<div className="flex justify-center">
															<div className="w-64 h-64 p-4 rounded-lg">
																<Cuer 
																	arena="https://example.com/logo.png" 
																	value={stealthAddress} 
																	size={240}
																/>
															</div>
														</div>
														<div className="space-y-2">
															<Label className="text-sm text-muted-foreground">Stealth Address</Label>
															<div className="flex gap-2">
																<Input
																	value={stealthAddress}
																	readOnly
																	className="font-mono text-xs"
																/>
																<Button
																	size="icon"
																	variant="outline"
																	onClick={() => {
																		navigator.clipboard.writeText(stealthAddress || '')
																		addLog('Stealth address copied to clipboard')
																	}}
																>
																	<Copy className="h-4 w-4" />
																</Button>
															</div>
															<p className="text-xs text-muted-foreground">
																Use this address for enhanced privacy. Funds sent here will be forwarded to your main wallet.
															</p>
														</div>
													</TabsContent>
												</Tabs>
												<Alert className="bg-muted/50 border-muted">
													<AlertCircle className="h-4 w-4" />
													<AlertDescription className="text-xs">
														Only send {activeChain.data?.name} network assets to these addresses
													</AlertDescription>
												</Alert>
											</div>
											<DrawerFooter>
												<DrawerClose asChild>
													<Button variant="outline">Close</Button>
												</DrawerClose>
											</DrawerFooter>
										</DrawerContent>
									</Drawer>
								</div>
							</>
						) : (
							<div className="text-center py-8">
								<p className="text-white/80">Connect your wallet to continue</p>
							</div>
						)}
					</CardContent>
				</Card>


				<Tabs defaultValue="send" className="w-full">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="send">
							<Send className="h-4 w-4 mr-2" />
							Send
						</TabsTrigger>
						<TabsTrigger value="wallet">
							<Key className="h-4 w-4 mr-2" />
							Setup
						</TabsTrigger>
						<TabsTrigger value="hardware">
							<Shield className="h-4 w-4 mr-2" />
							Hardware
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

					{/* Send Tab */}
					<TabsContent value="send" className="space-y-6 mt-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Send className="h-5 w-5" />
									Send Funds
								</CardTitle>
								<CardDescription>
									Send ETH or USDC to multiple recipients
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{!currentWalletClient ? (
									<Alert>
										<AlertCircle className="h-4 w-4" />
										<AlertDescription>
											Please connect your wallet to send funds
										</AlertDescription>
									</Alert>
								) : (
									<>
										<div className="space-y-4">
											{recipients.map((recipient, index) => (
												<Card key={recipient.id} className="p-4">
													<div className="space-y-3">
														<div className="flex items-center justify-between">
															<Label className="text-sm font-medium">Recipient {index + 1}</Label>
															{recipients.length > 1 && (
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={() => removeRecipient(recipient.id)}
																>
																	<X className="h-4 w-4" />
																</Button>
															)}
														</div>
														<Input
															placeholder="Recipient address (0x...)"
															value={recipient.address}
															onChange={(e) => updateRecipient(recipient.id, 'address', e.target.value)}
														/>
														<div className="grid grid-cols-2 gap-2">
															<Input
																type="number"
																placeholder="Amount"
																value={recipient.amount}
																onChange={(e) => updateRecipient(recipient.id, 'amount', e.target.value)}
															/>
															<Select
																value={recipient.currency}
																onValueChange={(value) => updateRecipient(recipient.id, 'currency', value as 'ETH' | 'USDC')}
															>
																<SelectTrigger>
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="USDC">USDC</SelectItem>
																	<SelectItem value="ETH">ETH</SelectItem>
																</SelectContent>
															</Select>
														</div>
													</div>
												</Card>
											))}
										</div>

										<Button
											variant="outline"
											onClick={addRecipient}
											className="w-full"
										>
											<Plus className="mr-2 h-4 w-4" />
											Add Recipient
										</Button>

										<Separator />

										<div className="space-y-2">
											<h4 className="font-medium">Summary</h4>
											<div className="space-y-1 text-sm">
												{recipients.filter(r => r.amount && parseFloat(r.amount) > 0).map((recipient, index) => (
													<div key={recipient.id} className="flex justify-between">
														<span className="text-muted-foreground">
															Recipient {index + 1}: {recipient.address.substring(0, 10)}...
														</span>
														<span className="font-medium">
															{recipient.amount} {recipient.currency}
														</span>
													</div>
												))}
											</div>
										</div>

										{delegation && (
											<Alert>
												<Zap className="h-4 w-4" />
												<AlertDescription>
													USDC transfers will be gasless using Circle's paymaster
												</AlertDescription>
											</Alert>
										)}

										<Button
											onClick={handleMultiSend}
											disabled={
												!recipients.some(r => r.address && r.amount && parseFloat(r.amount) > 0)
											}
											className="w-full"
											size="lg"
										>
											<Send className="mr-2 h-4 w-4" />
											Send Funds
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


				<Card>
					<CardHeader>
						<CardTitle>Avail bridge</CardTitle>
					</CardHeader>
					<CardContent>
						<AvailComponent />
					</CardContent>
				</Card>

			</div>
		</div>
	)
}