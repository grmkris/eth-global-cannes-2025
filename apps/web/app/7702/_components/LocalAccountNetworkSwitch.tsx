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

interface LocalAccountNetworkSwitchProps {
  currentChainId: number
  onNetworkChange: (chainId: number) => void
  disabled?: boolean
}

export function LocalAccountNetworkSwitch({ 
  currentChainId, 
  onNetworkChange,
  disabled = false
}: LocalAccountNetworkSwitchProps) {
  const chains = useChains()
  
  return (
    <Select 
      value={currentChainId.toString()} 
      onValueChange={(value) => onNetworkChange(parseInt(value))}
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