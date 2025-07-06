import { useQuery } from "@tanstack/react-query"
import { initializeAvail } from "./avail"
import { useEoaWalletClient } from "./eoa-hooks"
import type { RequestArguments } from "@avail-project/nexus"

export const AvailComponent = () => {

  const wc = useEoaWalletClient()
  

  const avail = useQuery({
    queryKey: ['avail'],
    queryFn: () => initializeAvail({
    })
  })
  return <div>AvailComponent</div>
}