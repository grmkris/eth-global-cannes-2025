import { DeviceStatus, DiscoveredDevice } from "@ledgerhq/device-management-kit";
import { dmk } from "./dmk";
import {
  SignerEth,
  SignerEthBuilder,
} from "@ledgerhq/device-signer-kit-ethereum";
import { ethers, Signature as EthersSignature, hashAuthorization, Transaction } from "ethers";
import { DeviceActionStatus } from "@ledgerhq/device-management-kit";
import type { TransactionRequest, TransactionRequestEIP7702 } from "viem";


// Global variables to store subscriptions and session info
let discoverySubscription: any = null;
let stateSubscription: any = null;
let currentSessionId: string | null = null;
let currentSignerEth: SignerEth | null = null;

export interface DeviceState {
  deviceStatus: DeviceStatus;
  batteryStatus?: {
    level: number;
  };
  currentApp?: {
    name: string;
    version: string;
  };
  deviceModelId: string;
}

export function startDiscoveryAndConnect() {
  // Clear any previous discovery
  if (discoverySubscription) {
    discoverySubscription.unsubscribe();
  }

  console.log("Starting device discovery...");

  // Start discovering - this will scan for any connected devices
  discoverySubscription = dmk.startDiscovering({}).subscribe({
    next: async (device: DiscoveredDevice) => {
      console.log(
        `Found device: ${device.id}, model: ${device.deviceModel.model}`,
      );

      // Connect to the first device we find
      try {
        // Pass the full device object, not just the ID
        currentSessionId = await dmk.connect({ device });
        console.log(`Connected! Session ID: ${currentSessionId}`);

        // Stop discovering once we connect
        discoverySubscription.unsubscribe();

        // Get device information
        const connectedDevice = dmk.getConnectedDevice({
          sessionId: currentSessionId,
        });
        console.log(`Device name: ${connectedDevice.name}`);
        console.log(`Device model: ${connectedDevice.modelId}`);

        // Create and store the SignerEth instance
        currentSignerEth = new SignerEthBuilder({
          dmk,
          sessionId: currentSessionId,
          originToken: "origin-token",
        }).build();

        console.log("SignerEth instance created successfully");
        console.log("Make sure the Ethereum app is open on your Ledger device");

        // Start monitoring device state
        stateSubscription = monitorDeviceState(currentSessionId);
      } catch (error) {
        console.error("Connection failed:", error);
      }
    },
    error: (error) => {
      console.error("Discovery error:", error);
    },
  });
}

export function monitorDeviceState(sessionId: string): any {
  return dmk.getDeviceSessionState({ sessionId }).subscribe({
    next: (state: DeviceState) => {
      console.log(`Device status: ${state.deviceStatus}`);

      // Check for specific status conditions
      if (state.deviceStatus === DeviceStatus.LOCKED) {
        console.log("Device is locked - please enter your PIN");
      }

      // Show battery level if available
      if (state.batteryStatus) {
        console.log(`Battery level: ${state.batteryStatus.level}%`);
      }

      // Show app information if available
      if (state.currentApp) {
        console.log(`Current app: ${state.currentApp.name}`);
        console.log(`App version: ${state.currentApp.version}`);
      }

      // Basic device model info
      console.log(`Device model: ${state.deviceModelId}`);
      console.log(`current session id: ${currentSessionId}`);
    },
    error: (error) => {
      console.error("State monitoring error:", error);
    },
  });
}

// Always clean up resources when done
export async function cleanup() {
  // Unsubscribe from all observables
  if (discoverySubscription) {
    discoverySubscription.unsubscribe();
  }

  if (stateSubscription) {
    stateSubscription.unsubscribe();
  }

  // Clear the signer instance
  currentSignerEth = null;

  // Disconnect from device if connected
  if (currentSessionId) {
    try {
      await dmk.disconnect({ sessionId: currentSessionId });
      console.log("Device disconnected successfully");
      currentSessionId = null;
    } catch (error) {
      console.error("Disconnection error:", error);
    }
  }
}

// Export current session ID for external use
export function getCurrentSessionId() {
  return currentSessionId;
}

// Get the current SignerEth instance
export function getCurrentSignerEth(): SignerEth | null {
  return currentSignerEth;
}

function bigIntReplacer(_key: string, value: any): any {
  return typeof value === 'bigint' ? value.toString() : value;
}

const serializeTx = (txObject: TransactionRequestEIP7702) => {
  // Option A: JSON serialization (simple but order-sensitive)
  return JSON.stringify(txObject, bigIntReplacer);
};

// Sign a transaction using the Ledger device with observable pattern
export async function signTransactionWithObservable(
  transaction: TransactionRequestEIP7702,
) {
  if (!currentSignerEth) {
    throw new Error("No Ledger device connected. Please connect a device first.");
  }

  try {
    console.log("Signing transaction with Ledger device:", transaction);
      
      const serializedTx = serializeTx(transaction);
      console.log("Serialized transaction:", serializedTx);

    // Log the transaction object for debugging
    console.log("Transaction object:", {
      ...transaction,
    });

    const derivationPath = "44'/60'/0'/0/0";

    // Convert transaction to Uint8Array
    const transactionBytes = new Uint8Array(Buffer.from(serializedTx, 'hex'));
    
    const result = await currentSignerEth.signMessage(derivationPath, transactionBytes).observable.toPromise();
    console.log("Sign transaction result:", result);
    if (result?.status === DeviceActionStatus.Completed) {
      return result.output;
    }
    throw new Error(`Failed to sign transaction: ${result?.status}`);
  } catch (error) {
    console.error("Failed to sign transaction:", error);
    throw new Error(`Failed to sign transaction: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function signDelegationAuthorization(
  chainId: number,
  contractAddress: string,
  nonce: number,
) {
  if (!currentSignerEth) {
    throw new Error("No Ledger device connected. Please connect a device first.");
  }
  console.log("signing delegation authorization" , {
    chainId,
    contractAddress,
    nonce,
  });
  // create promise and resolve it with the result
  const result = currentSignerEth.signDelegationAuthorization("44'/60'/0'/0/0", 11155111, contractAddress, nonce);
  const awaited = await result.observable.toPromise();
  console.log("Awaited result:", awaited);
  if (awaited?.status === DeviceActionStatus.Completed) {
    return awaited.output;
  }
  console.log("Awaited error:", awaited);
  throw new Error(`Failed to sign delegation authorization: ${awaited?.status}`);
}

/**
 * 
 * Manually create the hash and use sign message function to sign it
 */
export async function signDelegationAuthorizationRaw(
  chainId: number,
  contractAddress: string,
  nonce: number,
) {
  if (!currentSignerEth) {
    throw new Error("No Ledger device connected. Please connect a device first.");
  }
  const hash = hashAuthorization({
    chainId,
    address: contractAddress,
    nonce,
  });
  const result = await currentSignerEth.signMessage("44'/60'/0'/0/0", hash).observable.toPromise();
  if (result?.status === DeviceActionStatus.Completed) {
    return result.output;
  }
  throw new Error(`Failed to sign delegation authorization: ${result?.status}`);  
}

// Helper function to create a hardcoded transaction for testing
export function createHardcodedTransaction() {
  return {
    to: "0x0A7Db9806d6ec8166fB97CD3F3C23a5d15Dbe91b", // Mock recipient address
    gasPrice: "20000000000", // Mock gas price in wei
    gasLimit: 21000,
    nonce: 0, // Mock nonce
    chainId: 1, // Mock chain ID (Ethereum mainnet)
    data: "0x",
    value: "1000000000000000000", // Mock value in wei (1 ETH)
  };
}

// Get the account address from the Ledger device
export async function getAccountAddress(): Promise<string> {
  if (!currentSignerEth) {
    throw new Error("No Ledger device connected. Please connect a device first.");
  }
  const result = await currentSignerEth.getAddress("44'/60'/0'/0/0").observable.toPromise();
  console.log("Ledger account address:", result);
  if (result?.status === DeviceActionStatus.Completed) {
    console.log("Ledger account address:", result.output.address);
    return result.output.address;
  }
  throw new Error(`Failed to get account address: ${result?.status}`);
}

// Export DMK instance for direct use
export { dmk }; 