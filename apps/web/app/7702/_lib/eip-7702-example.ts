import { privateKeyToAccount } from 'viem/accounts'
import { walletClient } from './config'
import { abi, contractAddress } from './contract'
 
const eoa = privateKeyToAccount('0x...')
 
// 1. Authorize designation of the Contract onto the EOA.
const authorization = await walletClient.signAuthorization({
  account: eoa,
  contractAddress,
})
 
// 2. Designate the Contract on the EOA, and invoke the 
//    `initialize` function.
const hash = await walletClient.writeContract({
  abi,
  address: eoa.address,
  authorizationList: [authorization],
  //                  ↑ 3. Pass the Authorization as a parameter.
  functionName: 'initialize',
})