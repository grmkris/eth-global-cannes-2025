'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { useChains } from 'wagmi'

interface CopyableAddressProps {
  address: string
  chainId?: number
  showFullAddress?: boolean
  className?: string
}

export function CopyableAddress({ address, chainId, showFullAddress = false, className = '' }: CopyableAddressProps) {
  const [copied, setCopied] = useState(false)
  const chains = useChains()
  
  const displayAddress = showFullAddress 
    ? address 
    : `${address.slice(0, 6)}...${address.slice(-4)}`
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const explorerUrl = chainId ? chains.find(chain => chain.id === chainId)?.blockExplorers?.default.url : null
  
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <span className="font-mono text-xs">{displayAddress}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-5 w-5 p-0"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex"
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </a>
      )}
    </div>
  )
}