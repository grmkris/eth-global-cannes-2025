import { type Address } from 'viem'

export type NetworkConfig = {
  webAuthnDelegationAddress: Address
  simpleMintableTokenAddress?: Address
  fallbackP256VerifierAddress?: Address
  snojContractAddress?: Address
}

export const networkConfigs: Record<number, NetworkConfig> = {
  // Zircuit Garfield Testnet
  48898: {
    webAuthnDelegationAddress: '0x76eaf7894decdd0e408524762faef5c2184b287a', // Replace with deployed address
    simpleMintableTokenAddress: undefined, // Add when deployed
    fallbackP256VerifierAddress: '0xAC81d3F716F27Bec64384000a80A0106e989707A',
    snojContractAddress: '0x0000000000000000000000000000000000000000',
  },
  // Ethereum Sepolia
  11155111: {
    webAuthnDelegationAddress: '0xac81d3f716f27bec64384000a80a0106e989707a',
    simpleMintableTokenAddress: undefined, // Add when deployed
    fallbackP256VerifierAddress: "0xbc50c13ee53b7bb7fb788ce35a1d1562e2e87ede", // Add when deployed
    snojContractAddress: '0x40e03c561eCC97aA2A44C2A1453fFBF4305CccC7',
  },
}

export function getNetworkConfig(chainId: number): NetworkConfig | undefined {
  return networkConfigs[chainId]
}

export function getContractAddress(chainId: number, contract: keyof NetworkConfig): Address | undefined {
  const config = getNetworkConfig(chainId)
  return config?.[contract]
}