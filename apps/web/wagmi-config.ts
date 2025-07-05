
// config/index.tsx

import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { zircuitGarfieldTestnet, sepolia } from '@reown/appkit/networks'
import { cookieStorage, createStorage } from 'wagmi'

// Get projectId from https://cloud.reown.com
export const projectId = '252a2357b74167c2db0cfb4b03175d4f'

if (!projectId) {
  throw new Error('Project ID is not defined')
}

export const networks = [zircuitGarfieldTestnet, sepolia]

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
})

export const wagmiConfig = wagmiAdapter.wagmiConfig