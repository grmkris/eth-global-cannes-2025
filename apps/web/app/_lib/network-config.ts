import { type Address } from 'viem'

export type NetworkConfig = {
  webAuthnDelegationAddress: Address
  simpleMintableTokenAddress?: Address
  fallbackP256VerifierAddress?: Address
  snojContractAddress?: Address
  experimentERC20Address?: Address
  experimentDelegationAddress?: Address
}

export const networkConfigs: Record<number, NetworkConfig> = {
  // Zircuit Garfield Testnet
  48898: {
    webAuthnDelegationAddress: '0x76eaf7894decdd0e408524762faef5c2184b287a', // Replace with deployed address
    simpleMintableTokenAddress: undefined, // Add when deployed
    fallbackP256VerifierAddress: '0xAC81d3F716F27Bec64384000a80A0106e989707A',
    snojContractAddress: '0x0000000000000000000000000000000000000000',
    experimentERC20Address: '0x0000000000000000000000000000000000000000',
    experimentDelegationAddress: '0x0000000000000000000000000000000000000000',
  },
  // Ethereum Sepolia
  11155111: { 
    webAuthnDelegationAddress: '0x9F66232B2d3A853b9D0a1eF603635Ca9bCc3C9Fb',
    simpleMintableTokenAddress: undefined, // Add when deployed
    fallbackP256VerifierAddress: "0x9F66232B2d3A853b9D0a1eF603635Ca9bCc3C9Fb", // Add when deployed
    snojContractAddress: '0x40e03c561eCC97aA2A44C2A1453fFBF4305CccC7',
    experimentERC20Address: '0x1d8723C15f6c3A7d8A00B3a382fcf77f3df7EA7d',
    experimentDelegationAddress: '0xe5F96d72bB66010c6eb7655C342F00ced4e979B8', // Authorized origin set to: 0x5C6C1227CC271c4450cA3e80d7249EcE4506d19c
  },
  // arb sepolia
  421614: {
    webAuthnDelegationAddress: '0xE380598084De1e195971BED5004F3459D99253cf',
    simpleMintableTokenAddress: undefined, // Add when deployed
    fallbackP256VerifierAddress: "0x9F66232B2d3A853b9D0a1eF603635Ca9bCc3C9Fb", // Add when deployed
    snojContractAddress: '0x40e03c561eCC97aA2A44C2A1453fFBF4305CccC7',
    experimentERC20Address: '0x1d8723C15f6c3A7d8A00B3a382fcf77f3df7EA7d',
    experimentDelegationAddress: '0xe5F96d72bB66010c6eb7655C342F00ced4e979B8', // Authorized origin set to: 0x5C6C1227CC271c4450cA3e80d7249EcE4506d19c
  },
  // op sepolia
  11155420: {
    webAuthnDelegationAddress: '0xAC81d3F716F27Bec64384000a80A0106e989707A',
    simpleMintableTokenAddress: undefined, // Add when deployed
    fallbackP256VerifierAddress: "0x9F66232B2d3A853b9D0a1eF603635Ca9bCc3C9Fb", // Add when deployed
    snojContractAddress: '0x40e03c561eCC97aA2A44C2A1453fFBF4305CccC7',
    experimentERC20Address: '0x1d8723C15f6c3A7d8A00B3a382fcf77f3df7EA7d',
    experimentDelegationAddress: '0xe5F96d72bB66010c6eb7655C342F00ced4e979B8', // Authorized origin set to: 0x5C6C1227CC271c4450cA3e80d7249EcE4506d19c
  },
}

export function getNetworkConfig(chainId: number): NetworkConfig | undefined {
  return networkConfigs[chainId]
}

export function getContractAddress(chainId: number, contract: keyof NetworkConfig): Address | undefined {
  const config = getNetworkConfig(chainId)
  return config?.[contract]
}