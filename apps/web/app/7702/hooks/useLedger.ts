import { useState, useEffect, useCallback } from "react";
import { 
  startDiscoveryAndConnect, 
  cleanup, 
  getCurrentSessionId, 
  getCurrentSignerEth,
  signTransactionWithObservable,
  createHardcodedTransaction,
  getAccountAddress
} from "../lib/ledgerService";
import {
  SignerEth,
  SignerEthBuilder,
} from "@ledgerhq/device-signer-kit-ethereum";

export function useLedger() {
  const [isConnected, setIsConnected] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signerEth, setSignerEth] = useState<SignerEth | null>(null);
  const [accountAddress, setAccountAddress] = useState<string | null>(null);

  const connect = useCallback(async () => {
    try {
      setIsDiscovering(true);
      setError(null);
      
      // Start the discovery and connection process
      startDiscoveryAndConnect();
      
      // Check connection status periodically
      const checkConnection = () => {
        const sessionId = getCurrentSessionId();
        const currentSigner = getCurrentSignerEth();
        
        if (sessionId && currentSigner) {
          setIsConnected(true);
          setSignerEth(currentSigner);
          setIsDiscovering(false);
          
          // Get account address
          getAccountAddress().then(address => {
            setAccountAddress(address);
          }).catch(err => {
            console.error("Failed to get account address:", err);
          });
        } else {
          // Continue checking if not connected
          setTimeout(checkConnection, 1000);
        }
      };
      
      checkConnection();

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to Ledger");
      setIsDiscovering(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await cleanup();
      setIsConnected(false);
      setIsDiscovering(false);
      setError(null);
      setSignerEth(null);
      setAccountAddress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect from Ledger");
    }
  }, []);

  // Sign transaction with observable
  const signTransactionWithLedger = useCallback((
    transaction: any,
    onStateChange?: (state: any) => void,
    onError?: (error: any) => void,
    onComplete?: () => void
  ) => {
    try {
      setError(null);
      return signTransactionWithObservable(transaction, onStateChange, onError, onComplete);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign transaction";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Get hardcoded transaction for testing
  const getHardcodedTransaction = useCallback(() => {
    return createHardcodedTransaction();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    isConnected,
    isDiscovering,
    error,
    signerEth,
    accountAddress,
    connect,
    disconnect,
    signTransaction: signTransactionWithLedger,
    getHardcodedTransaction,
  };
} 