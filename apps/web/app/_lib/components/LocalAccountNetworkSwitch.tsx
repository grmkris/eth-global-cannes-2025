'use client'

import { useChains } from 'wagmi'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@workspace/ui/components/select'
import { Badge } from '@workspace/ui/components/badge'
import { Network } from 'lucide-react'
import { useActiveChain, useSetActiveChain } from '../eoa-hooks'

export function LocalAccountNetworkSwitch() {
  const chains = useChains()
  const activeChain = useActiveChain()
  const setActiveChain = useSetActiveChain()
  
  const currentChainId = activeChain.data?.id
  const disabled = !activeChain.data || setActiveChain.isPending
  
  const handleNetworkChange = (value: string) => {
    const chainId = parseInt(value)
    const selectedChain = chains.find(chain => chain.id === chainId)
    if (selectedChain) {
      setActiveChain.mutate(selectedChain)
    }
  }

  if (!currentChainId) {
    return null
  }

  return (
    <Select 
      value={currentChainId.toString()} 
      onValueChange={handleNetworkChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-[200px]">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {chains.map((chain) => (
          <SelectItem key={chain.id} value={chain.id.toString()}>
            <div className="flex items-center justify-between w-full">
              <span>{chain.name}</span>
              {chain.testnet && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Testnet
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}