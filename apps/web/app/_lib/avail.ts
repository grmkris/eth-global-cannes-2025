import { NexusSDK, type EthereumProvider } from '@avail-project/nexus';

export const initializeAvail = async (provider: EthereumProvider) => {
  // Initialize SDK
  const sdk = new NexusSDK();
  await sdk.initialize(provider); // Your Web3 provider

  // Or initialize with specific network environment
  const nexusSdk = new NexusSDK({
    network: 'testnet', // Testnet
  });
  await nexusSdk.initialize(provider);

  // Get unified balances
  const balances = await sdk.getUnifiedBalances();
  console.log('All balances:', balances);
}