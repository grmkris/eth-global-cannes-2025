
// config/index.tsx

import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { zircuitGarfieldTestnet, sepolia, arbitrumSepolia, optimismSepolia } from '@reown/appkit/networks'
import { cookieStorage, createStorage } from 'wagmi'

// Get projectId from https://cloud.reown.com
export const projectId = '252a2357b74167c2db0cfb4b03175d4f'

if (!projectId) {
  throw new Error('Project ID is not defined')
}

export const networks = [zircuitGarfieldTestnet, sepolia, arbitrumSepolia, optimismSepolia  ]

import { createConnector, type CreateConnectorFn } from '@wagmi/core'

export type LedgerConnectorParameters = {}

export function ledgerConnector(parameters: LedgerConnectorParameters = {}): CreateConnectorFn {
  return createConnector((config) => ({
    id: 'fooBarBaz',
    name: 'Foo Bar Baz',
    type: 'fooBarBaz',
    connect: async () => ({ accounts: [], chainId: 1 }),
    disconnect: async () => {},
    getAccounts: async () => [],
    getChainId: async () => 1,
    getProvider: async () => null,
    isAuthorized: async () => false,
    switchChain: async ({ chainId }) => config.chains.find(chain => chain.id === chainId) || config.chains[0],
    watchAccount: () => () => {},
    watchChainId: () => () => {},
    watchDisconnect: () => () => {},
    onAccountsChanged: () => {},
    onChainChanged: () => {},
    onDisconnect: () => {},
  }))
}

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks,
  connectors: [
      ledgerConnector({
        chains: networks,
        options: {
          projectId,
        },
      })
  ],
})

export const wagmiConfig = wagmiAdapter.wagmiConfig