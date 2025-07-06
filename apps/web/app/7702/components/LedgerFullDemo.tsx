"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Loader2,
  Send,
  CheckCircle,
  XCircle,
  Shield,
  Wallet,
} from "lucide-react";
import { useChains, useBalance } from "wagmi";
import {
  createLedgerAuthorization,
  sendLedgerTransactionWithAuthorization,
  waitForLedgerTransaction,
} from "../hooks/ledger-eip-7702";
import { sepolia } from "viem/chains";
import { type Hex, encodeFunctionData, parseEther, formatEther } from "viem";
import { passkeyDelegationAbi } from "../../_lib/abi/webauthn_delegation_abi";
import { networkConfigs } from "@/app/_lib/network-config";
import { useLedger } from "../hooks/useLedger";

export function LedgerFullDemo() {
  const {
    isConnected,
    isDiscovering,
    error,
    accountAddress,
    connect,
    disconnect,
  } = useLedger();

  console.log("ledger full demo accountAddress", accountAddress);

  const [step, setStep] = useState<"connect" | "authorize" | "execute">(
    "connect"
  );
  const [authorization, setAuthorization] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [txReceipt, setTxReceipt] = useState<any>(null);

  // Transaction form state
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  // Get balance
  const { data: balance } = useBalance({
    address: accountAddress as Hex,
    chainId: sepolia.id,
  });

  useEffect(() => {
    if (isConnected && step === "connect") {
      setStep("authorize");
    }
  }, [isConnected, step]);

  const handleConnect = async () => {
    await connect();
  };

  const handleCreateAuthorization = async () => {
    if (!isConnected) return;

    try {
      setIsProcessing(true);
      setProcessError(null);

      // Get the appropriate contract address for the chain
      const contractAddress =
        networkConfigs[sepolia.id]?.webAuthnDelegationAddress ||
        "0x0000000000000000000000000000000000000000";

      const auth = await createLedgerAuthorization({
        contractAddress,
        chain: sepolia,
        nonce: 0,
        chainId: sepolia.id,
      });

      setAuthorization(auth);
      setStep("execute");
    } catch (err) {
      console.error("Failed to create authorization:", err);
      setProcessError(
        err instanceof Error ? err.message : "Failed to create authorization"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendTransaction = async () => {
    if (!authorization || !accountAddress || !recipient || !amount) return;

    try {
      setIsProcessing(true);
      setProcessError(null);
      setTxHash(null);
      setTxReceipt(null);

      // For this demo, we'll send ETH to the recipient
      // In a real implementation, you could:
      // 1. Initialize the delegation contract (done once)
      // 2. Use the delegated contract to execute calls
      // 3. Interact with other contracts through the delegation

      // Send ETH with authorization
      const hash = await sendLedgerTransactionWithAuthorization({
        chain: sepolia,
        authorization,
        to: recipient as Hex,
        value: parseEther(amount),
        data: "0x" as Hex,
      });

      setTxHash(hash);

      // Wait for receipt
      const receipt = await waitForLedgerTransaction({
        chain: sepolia,
        hash,
      });

      setTxReceipt(receipt);
    } catch (err) {
      console.error("Failed to send transaction:", err);
      setProcessError(
        err instanceof Error ? err.message : "Failed to send transaction"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInitializeDelegation = async () => {
    if (!authorization || !accountAddress) return;

    try {
      setIsProcessing(true);
      setProcessError(null);
      setTxHash(null);
      setTxReceipt(null);

      // Generate dummy public key for demo
      // In production, this would be the passkey's public key
      const dummyPubKeyX = BigInt(
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
      );
      const dummyPubKeyY = BigInt(
        "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"
      );

      // Encode the initialize function call
      const initializeData = encodeFunctionData({
        abi: passkeyDelegationAbi,
        functionName: "initialize",
        args: [accountAddress as Hex, dummyPubKeyX, dummyPubKeyY],
      });

      // Send transaction with authorization to initialize the delegation contract
      const hash = await sendLedgerTransactionWithAuthorization({
        chain: sepolia,
        authorization,
        to: accountAddress as Hex, // Self-call to initialize
        value: BigInt(0),
        data: initializeData,
      });

      setTxHash(hash);

      // Wait for receipt
      const receipt = await waitForLedgerTransaction({
        chain: sepolia,
        hash,
      });

      setTxReceipt(receipt);
    } catch (err) {
      console.error("Failed to initialize delegation:", err);
      setProcessError(
        err instanceof Error ? err.message : "Failed to initialize delegation"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Ledger EIP-7702 Full Demo
        </CardTitle>
        <CardDescription>
          Complete flow: Connect → Create Authorization → Execute Transaction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {(error || processError) && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error || processError}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Connect */}
        {step === "connect" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${isConnected ? "bg-green-500 text-white" : "bg-muted"}`}
              >
                1
              </div>
              <span className="font-medium">Connect Ledger Device</span>
            </div>

            <Button
              onClick={handleConnect}
              disabled={isDiscovering}
              className="w-full"
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting to Ledger...
                </>
              ) : (
                "Connect Ledger Device"
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Create Authorization */}
        {step === "authorize" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Connected: {accountAddress?.slice(0, 6)}...
                {accountAddress?.slice(-4)}
              </span>
            </div>

            {balance && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" />
                Balance: {formatEther(balance.value)} ETH
              </div>
            )}

            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-white">
                2
              </div>
              <span className="font-medium">Create EIP-7702 Authorization</span>
            </div>

            <div className="p-3 bg-muted rounded-md text-xs">
              <div>
                <strong>Contract:</strong>{" "}
                {networkConfigs[sepolia.id]?.webAuthnDelegationAddress ||
                  "Not configured"}
              </div>
              <div>
                <strong>Chain:</strong> {sepolia.name}
              </div>
              <div>
                <strong>EOA:</strong> {accountAddress}
              </div>
            </div>

            <Button
              onClick={handleCreateAuthorization}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Authorization...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Create Authorization
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 3: Execute Transaction */}
        {step === "execute" && authorization && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Authorization Created!
              </span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-white">
                3
              </div>
              <span className="font-medium">Execute Transaction</span>
            </div>

            <div className="space-y-3 p-4 border rounded-lg">
              <h4 className="font-medium">
                Option 1: Initialize Delegation Contract
              </h4>
              <p className="text-sm text-muted-foreground">
                Initialize the delegation contract with a passkey public key
                (one-time setup)
              </p>
              <Button
                onClick={handleInitializeDelegation}
                disabled={isProcessing}
                variant="secondary"
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  "Initialize Delegation"
                )}
              </Button>
            </div>

            <div className="space-y-3 p-4 border rounded-lg">
              <h4 className="font-medium">Option 2: Send ETH</h4>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="recipient">Recipient Address</Label>
                  <Input
                    id="recipient"
                    placeholder="0x..."
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount (ETH)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.001"
                    placeholder="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleSendTransaction}
                disabled={isProcessing || !recipient || !amount}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Transaction...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send ETH
                  </>
                )}
              </Button>
            </div>

            {/* Transaction Result */}
            {txHash && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium">Transaction Sent!</div>
                <div className="space-y-1">
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
                      <strong>Status:</strong>{" "}
                      {txReceipt.status === "success"
                        ? "✅ Success"
                        : "❌ Failed"}
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={() => {
                disconnect();
                setStep("connect");
                setAuthorization(null);
                setTxHash(null);
                setTxReceipt(null);
              }}
              variant="outline"
              className="w-full"
            >
              Start Over
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
