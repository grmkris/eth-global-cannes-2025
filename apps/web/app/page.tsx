"use client"

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { CirclePaymasterTransferFull } from "../components/CirclePaymasterTransferFull";
import { useAccount } from "wagmi";
import { Wallet, ArrowRight, Shield, Zap } from "lucide-react";
import Link from "next/link";

export default function Page() {
	const { isConnected, address } = useAccount();

	// These would typically come from environment variables or configuration
	const usdcAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Arbitrum Sepolia USDC
	const paymasterAddress = "0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966"; // Replace with actual paymaster address
	const recipientAddress = "0x219B10CD3e58da840bB10AF6cae9240ea4f404A2"; // Replace with actual recipient

	return (
		<div className="flex flex-col items-center justify-center min-h-svh p-4">
			<div className="flex flex-col items-center justify-center gap-8 w-full max-w-6xl">
				{/* Header */}
				<div className="text-center">
					<h1 className="text-4xl font-bold mb-4">ETH Global Cannes 2025</h1>
					<p className="text-muted-foreground text-center max-w-2xl text-lg">
						Welcome to ETH Global Cannes 2025 - Experience the future of Web3 with our innovative wallet solutions
					</p>
				</div>

				{/* Wallet Status */}
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Wallet className="h-5 w-5" />
							Wallet Status
						</CardTitle>
					</CardHeader>
					<CardContent>
						{isConnected ? (
							<div className="space-y-2">
								<div className="flex items-center gap-2 text-green-600">
									<div className="w-2 h-2 bg-green-500 rounded-full"></div>
									<span className="text-sm font-medium">Connected</span>
								</div>
								<div className="text-xs font-mono bg-muted p-2 rounded">
									{address?.slice(0, 6)}...{address?.slice(-4)}
								</div>
							</div>
						) : (
							<div className="space-y-2">
								<div className="flex items-center gap-2 text-orange-600">
									<div className="w-2 h-2 bg-orange-500 rounded-full"></div>
									<span className="text-sm font-medium">Not Connected</span>
								</div>
								<p className="text-xs text-muted-foreground">
									Connect your wallet to use the Circle Paymaster features
								</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Navigation Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
					<Link href="/7702" className="block">
						<Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Shield className="h-5 w-5" />
									EIP-7702 Wallet
								</CardTitle>
								<CardDescription>
									Advanced wallet features with passkey delegation and hardware wallet integration
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">Explore EIP-7702 features</span>
									<ArrowRight className="h-4 w-4" />
								</div>
							</CardContent>
						</Card>
					</Link>

					<Link href="/circle-paymaster" className="block">
						<Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Zap className="h-5 w-5" />
									Circle Paymaster
								</CardTitle>
								<CardDescription>
									Full Circle Paymaster demo with USDC transfers
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">View full demo</span>
									<ArrowRight className="h-4 w-4" />
								</div>
							</CardContent>
						</Card>
					</Link>
				</div>

				{/* Circle Paymaster Component */}
				{isConnected && (
					<div className="w-full max-w-4xl">
						<div className="text-center mb-6">
							<h2 className="text-2xl font-bold mb-2">Quick Transfer Demo</h2>
							<p className="text-muted-foreground">
								Transfer USDC using Circle Paymaster with your connected wallet
							</p>
						</div>
						<div className="flex justify-center">
							<CirclePaymasterTransferFull
								usdcAddress={usdcAddress}
								paymasterAddress={paymasterAddress}
								recipientAddress={recipientAddress}
							/>
						</div>
					</div>
				)}

				{/* Connect Wallet Button */}
				{!isConnected && (
					<div className="text-center">
						<Button size="lg">
							<appkit-button />
						</Button>
						<p className="text-sm text-muted-foreground mt-2">
							Connect your wallet to access all features
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
