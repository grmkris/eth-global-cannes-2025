import { example_abi } from './example_abi'
import type { Account, Address, Chain, WalletClient } from 'viem'
 
const contractAddress = '0x...'

export const initialize = async (props: {
  walletClient: WalletClient
  eoa: Account
  chain: Chain
}) => {
  const { walletClient, eoa } = props;
  const authorization = await walletClient.signAuthorization({
    account: eoa,
    contractAddress,
  });
  const result = await walletClient.writeContract({
    abi: example_abi,
    account: eoa,
    address: contractAddress,
    authorizationList: [authorization],
    functionName: 'initialize',
    chain: props.chain,
  });   
  return result;
}

export const createPing = async (props: {
  walletClient: WalletClient
  eoa: Account
  contractAddress: Address
  chain: Chain
}) => {
  const { walletClient, eoa, contractAddress, chain } = props
  const authorization = await walletClient.signAuthorization({
    account: eoa,
    contractAddress,
  });
  const hash = await walletClient.writeContract({
    abi: example_abi,
    account: eoa,
    address: contractAddress,
    authorizationList: [authorization],
    functionName: 'ping',
    chain: props.chain,
  })
  return hash;
}