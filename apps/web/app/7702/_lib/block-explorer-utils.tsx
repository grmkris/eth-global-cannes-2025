import React from 'react'
import { ExternalLink } from 'lucide-react'

const blockExplorers: Record<number, { name: string; url: string }> = {
  // Zircuit Garfield Testnet
  48898: {
    name: 'Zircuit Explorer',
    url: 'https://explorer.garfieldnet.zircuit.com'
  },
  // Ethereum Sepolia
  11155111: {
    name: 'Etherscan',
    url: 'https://sepolia.etherscan.io'
  }
}

export function getBlockExplorerUrl(chainId: number, hash: string, type: 'tx' | 'address' = 'tx'): string | null {
  const explorer = blockExplorers[chainId]
  if (!explorer) return null
  
  return `${explorer.url}/${type}/${hash}`
}

export function TxHashLink({ hash, chainId }: { hash: string; chainId: number }) {
  const url = getBlockExplorerUrl(chainId, hash, 'tx')
  const shortHash = `${hash.slice(0, 10)}...${hash.slice(-8)}`
  
  if (!url) {
    return <span className="font-mono text-xs">{shortHash}</span>
  }
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-blue-500 hover:text-blue-600 hover:underline"
    >
      {shortHash}
      <ExternalLink className="h-3 w-3" />
    </a>
  )
}

export function AddressLink({ address, chainId }: { address: string; chainId: number }) {
  const url = getBlockExplorerUrl(chainId, address, 'address')
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
  
  if (!url) {
    return <span className="font-mono text-xs">{shortAddress}</span>
  }
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-blue-500 hover:text-blue-600 hover:underline"
    >
      {shortAddress}
      <ExternalLink className="h-3 w-3" />
    </a>
  )
}