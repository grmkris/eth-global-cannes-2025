"use client"

import { CirclePaymasterTransferFull } from "../../components/CirclePaymasterTransferFull";

export default function CirclePaymasterPage() {
  
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
          <CirclePaymasterTransferFull />
        </div>
      </div>
    </div>
  );
} 