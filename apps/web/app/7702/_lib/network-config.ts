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
    webAuthnDelegationAddress: '0xAabD36cceC2dCbEdcD16dB32fC60cd2FFF10d895',
    simpleMintableTokenAddress: undefined, // Add when deployed
    fallbackP256VerifierAddress: "0x9F66232B2d3A853b9D0a1eF603635Ca9bCc3C9Fb", // Add when deployed
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