import { useState, useEffect, useCallback } from "react";
import { startDiscoveryAndConnect, cleanup, getCurrentSessionId } from "../lib/ledgerService";

export function useLedger() {
  const [isConnected, setIsConnected] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    try {
      setIsDiscovering(true);
      setError(null);
      
      // Start the discovery and connection process
      startDiscoveryAndConnect();
      
      // Check connection status periodically
      const checkConnection = () => {
        const sessionId = getCurrentSessionId();
        setIsConnected(!!sessionId);
        
        if (sessionId) {
          setIsDiscovering(false);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect from Ledger");
    }
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
    connect,
    disconnect,
  };
} 