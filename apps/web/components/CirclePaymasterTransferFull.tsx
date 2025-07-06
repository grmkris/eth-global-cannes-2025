"use client"

import { useState } from "react";
import { createWalletClient, type Address } from "viem";
import { sepolia } from "viem/chains";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { createPublicClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { useCircle7702Transfer, useUSDCBalance } from "@/app/_lib/circle-hooks.js";
import { useActiveChain } from "@/app/_lib/eoa-hooks";



export function   CirclePaymasterTransferFull() {
  const [transferAmount, setTransferAmount] = useState("10000");

  const owner = privateKeyToAccount(generatePrivateKey());
  const activeChain = useActiveChain();
  const walletClient = createWalletClient({
    chain: activeChain.data ?? sepolia,
    transport: http(),
    account: owner,
  });
  const publicClient = createPublicClient({ chain: activeChain.data ?? sepolia, transport: http() });
  const circle7702Transfer = useCircle7702Transfer();
  const circleBalance = useUSDCBalance({ walletClient: walletClient, publicClient: publicClient });
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Circle Paymaster Transfer</CardTitle>
        <CardDescription>
          Transfer USDC using Circle Paymaster with 7702 smart account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="amount" className="text-sm font-medium">
            Transfer Amount (USDC)
          </label>
          <Input
            id="amount"
            type="number"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            placeholder="10000"
            disabled={circle7702Transfer.isPending}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Recipient Address</label>
          <Input
            value={recipientAddress}
            readOnly
            className="font-mono text-xs"
          />
        </div>

        <Button
          onClick={() => circle7702Transfer.mutate({ amount: BigInt(transferAmount), recipientAddress: recipientAddress as Address, walletClient: walletClient, publicClient: publicClient })}
          disabled={circle7702Transfer.isPending}
          className="w-full"
        >
          {circle7702Transfer.isPending ? "Processing..." : "Transfer USDC"}
        </Button>

        {circle7702Transfer.error && (
          <Alert variant="destructive">
            <AlertDescription>{circle7702Transfer.error.message}</AlertDescription>
          </Alert>
        )}

        {circle7702Transfer.isSuccess && (
          <Alert>
            <AlertDescription>Transfer successful</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
} 