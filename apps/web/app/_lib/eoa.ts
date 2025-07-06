import { createWalletClient, http, type Chain, type WalletClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { mainnet, sepolia, zircuitGarfieldTestnet } from "viem/chains";

const CHAIN_ID_TO_CHAIN = {
  11155111: sepolia,
  48898: zircuitGarfieldTestnet,
}

export const getOrCreateEoa = (chain: Chain) : WalletClient => {
  // react from local storage or create new one
  const eoa = localStorage.getItem("eoa");
  console.log('eoa', eoa)
  if (eoa) {
    return createWalletClient({
      transport: http(),
      account: privateKeyToAccount(eoa as `0x${string}`),
      chain: chain,
    });
  }
  const privateKey = generatePrivateKey();
  const walletClient = createWalletClient({
    transport: http(),
    account: privateKeyToAccount(privateKey as `0x${string}`),
    chain: chain,
  });
  console.log('walletClient', walletClient)
  localStorage.setItem("eoa", privateKey);
  return walletClient;
}

export const clearEoa = () => {
  localStorage.removeItem("eoa");
}

export const setActiveChain = (chain: Chain) => {
  localStorage.setItem("activeChain", chain.id.toString());
}

export const getActiveChain = () : Chain => {
  const activeChain = localStorage.getItem("activeChain");
  return activeChain ? CHAIN_ID_TO_CHAIN[parseInt(activeChain) as keyof typeof CHAIN_ID_TO_CHAIN] : sepolia;
}