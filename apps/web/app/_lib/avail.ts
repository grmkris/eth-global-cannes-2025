import { NexusSDK, type EthereumProvider } from "@avail-project/nexus";
import {
  getDefaultProvider,
  BrowserProvider,
  type Eip1193Provider,
  JsonRpcProvider,
} from "ethers";
import { Chain, createWalletClient, custom } from "viem";
import { sepolia } from "viem/chains";

export function getProvider(): EthereumProvider {
  // (1) grab your injected provider
  const eth = (window as any).ethereum as Eip1193Provider;
  if (!eth) throw new Error("No injected wallet found");

  // const newProvider = new

  // (2) wrap it in ethers’ BrowserProvider
  //    you can optionally force the chainId here, or pass
  //    { polling: true, pollingInterval: 4_000 } etc.
  // const provider = new BrowserProvider(eth);

  return eth as EthereumProvider;
}

export const initializeAvail = async (provider: EthereumProvider) => {
  // // Initialize SDK
  // const sdk = new NexusSDK();
  // await sdk.initialize(provider); // Your Web3 provider

  // Or initialize with specific network environment
  const nexusSdk = new NexusSDK({
    network: "testnet", // Testnet
  });
  await nexusSdk.initialize(provider);

  // Get unified balances
  const balances = await nexusSdk.getUnifiedBalances();
  console.log("All balances:", balances);

  return nexusSdk;
};

export const customRpc = {
  async request(method: string, params: unknown[]): Promise<unknown> {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    });

    const res = await fetch("https://eth-sepolia.public.blastapi.io", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!res.ok) {
      throw new Error(`RPC HTTP error ${res.status}`);
    }

    const { result, error } = (await res.json()) as {
      jsonrpc: string;
      id: number;
      result?: unknown;
      error?: { code: number; message: string };
    };

    if (error) {
      throw new Error(`RPC Error ${error.code}: ${error.message}`);
    }

    return result;
  },
};
