"use client"

import { useState } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { createBundlerClient, toSimple7702SmartAccount } from "viem/account-abstraction";
import { encodePacked, hexToBigInt } from "viem";
import { erc20Abi } from "viem";
import { arbitrumSepolia, sepolia } from "viem/chains";
import { signPermit } from "../lib/permit.js";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { createPublicClient, http, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { info } from "console";

interface CirclePaymasterTransferProps {
  usdcAddress: string;
  paymasterAddress: string;
  recipientAddress: string;
}

export function CirclePaymasterTransferFull({
  usdcAddress,
  paymasterAddress,
  recipientAddress,
}: CirclePaymasterTransferProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState("10000");

  const { address: connectedAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const handleTransfer = async () => {
    if (!isConnected || !connectedAddress || !walletClient || !publicClient) {
      setError("Please connect your wallet first");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const chain = sepolia;
      const usdcAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

      const client = createPublicClient({ chain, transport: http() });
      const owner = privateKeyToAccount("TODO ");
      const account = await toSimple7702SmartAccount({ client, owner });

      // 1.3. Check the USDC balance
      const usdc = getContract({ client, address: usdcAddress, abi: erc20Abi });
      const usdcBalance = await usdc.read.balanceOf([account.address]);

      console.log(`USDC balance of ${account.address}: ${usdcBalance} USDC`);

      // 2.2. Set up Circle Paymaster
      const paymasterAddress = "0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966"; // Circle Paymaster address

      const paymaster = {
        async getPaymasterData(parameters) {
          const permitAmount = 10000000n;
          const permitSignature = await signPermit({
            tokenAddress: usdcAddress,
            account,
            client,
            spenderAddress: paymasterAddress,
            permitAmount: permitAmount,
          });

          const paymasterData = encodePacked(
            ["uint8", "address", "uint256", "bytes"],
            [0, usdcAddress, permitAmount, permitSignature],
          );

          return {
            paymaster: paymasterAddress,
            paymasterData,
            paymasterVerificationGasLimit: 200000n,
            paymasterPostOpGasLimit: 15000n,
            isFinal: true,
          };
        },
      };

      // 3.1. Connect to the bundler

      const bundlerClient = createBundlerClient({
        account,
        client,
        paymaster,
        userOperation: {
          estimateFeesPerGas: async ({ account, bundlerClient, userOperation }) => {
            const { standard: fees } = await bundlerClient.request({
              method: "pimlico_getUserOperationGasPrice",
            });
            const maxFeePerGas = hexToBigInt(fees.maxFeePerGas);
            const maxPriorityFeePerGas = hexToBigInt(fees.maxPriorityFeePerGas);
            return { maxFeePerGas, maxPriorityFeePerGas };
          },
        },
        transport: http(`https://public.pimlico.io/v2/${client.chain.id}/rpc`),
      });

      // 3.2. Sign an authorization and submit the user operation
      const recipientAddress = "0x219B10CD3e58da840bB10AF6cae9240ea4f404A2"; // Example recipient address

      // Sign authorization for 7702 account
      const authorization = await owner.signAuthorization({
        chainId: chain.id,
        nonce: await client.getTransactionCount({ address: owner.address }),
        contractAddress: account.authorization.address,
      });
      // console.log("Authorization:", JSON.stringify(authorization, null, 2));

      // log types of all addresses
      console.log(typeof authorization.address)
      console.log(typeof authorization.chainId)
      console.log(typeof authorization.nonce)

      console.log(JSON.stringify(account))

      const hash = await bundlerClient.sendUserOperation({
        account,
        calls: [
          {
            to: usdc.address,
            abi: usdc.abi,
            functionName: "transfer",
            args: [recipientAddress, 10000n],
          },
        ],
        authorization: authorization,
      });
      console.log("UserOperation hash", hash);

    } catch (err) {
      console.error("Transfer failed:", err);
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Circle Paymaster Transfer</CardTitle>
        <CardDescription>
          Transfer USDC using Circle Paymaster with 7702 smart account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected && (
          <Alert>
            <AlertDescription>
              Please connect your wallet to use this feature
            </AlertDescription>
          </Alert>
        )}

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
            disabled={!isConnected || isLoading}
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
          onClick={handleTransfer}
          disabled={!isConnected || isLoading}
          className="w-full"
        >
          {isLoading ? "Processing..." : "Transfer USDC"}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
} 