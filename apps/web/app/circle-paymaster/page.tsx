"use client"

import { CirclePaymasterTransferFull } from "../../components/CirclePaymasterTransferFull";

export default function CirclePaymasterPage() {
  // These would typically come from environment variables or configuration
  const usdcAddress = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"; // Arbitrum Sepolia USDC
  const paymasterAddress = "0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966"; // Replace with actual paymaster address
  const recipientAddress = "0x0000000000000000000000000000000000000000"; // Replace with actual recipient

  return (
    <div className="flex items-center justify-center min-h-svh p-4">
      <div className="flex flex-col items-center justify-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Circle Paymaster Demo</h1>
          <p className="text-muted-foreground text-center max-w-md mt-2">
            Transfer USDC using Circle Paymaster with 7702 smart account
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl">
          <CirclePaymasterTransferFull
            usdcAddress={usdcAddress}
            paymasterAddress={paymasterAddress}
            recipientAddress={recipientAddress}
          />
        </div>
      </div>
    </div>
  );
} 