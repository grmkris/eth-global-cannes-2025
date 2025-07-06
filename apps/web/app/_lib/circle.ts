import { signPermit } from "@/lib/permit";
import { encodePacked, erc20Abi, getContract, hexToBigInt, http, type Address, type PublicClient, type WalletClient } from "viem"
import { createBundlerClient, type SmartAccount } from "viem/account-abstraction";

const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const PAYMASTER_ADDRESS = "0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966";

export const handleCircle7702Transfer = async (props: {
  walletClient: WalletClient
  publicClient: PublicClient
  amount: bigint
  recipientAddress: Address
}) => {
  const { walletClient, publicClient, amount, recipientAddress } = props;


  // 3.1. Connect to the bundler

  const bundlerClient = createBundlerClient({
    account: walletClient.account,
    client: publicClient,
    paymaster: {
      getPaymasterData: async (parameters) => {
        {
          console.log("getPaymasterData", parameters);
          const permitAmount = 10000000n;
          const permitSignature = await signPermit({
            tokenAddress: USDC_ADDRESS,
            account: walletClient.account,
            client: publicClient,
            spenderAddress: PAYMASTER_ADDRESS,
            permitAmount: permitAmount,
          });

          const paymasterData = encodePacked(
            ["uint8", "address", "uint256", "bytes"],
            [0, USDC_ADDRESS, permitAmount, permitSignature],
          );

          return {
            paymaster: PAYMASTER_ADDRESS,
            paymasterData,
            paymasterVerificationGasLimit: 200000n,
            paymasterPostOpGasLimit: 15000n,
            isFinal: true,
          };
        }
      },
    },
    userOperation: {
      estimateFeesPerGas: async ({ account, bundlerClient, userOperation }) => {
        console.log("estimateFeesPerGas", account, bundlerClient, userOperation);
        const fees = await bundlerClient.request({
          // @ts-expect-error - pimlico_getUserOperationGasPrice is not typed
          method: "pimlico_getUserOperationGasPrice",
        });
        console.log("estimateFeesPerGas fees", fees);
        if (typeof fees === "string") throw new Error("Invalid fees");
        // @ts-expect-error - pimlico_getUserOperationGasPrice is not typed
        const maxFeePerGas = hexToBigInt(fees.maxFeePerGas);
        // @ts-expect-error - pimlico_getUserOperationGasPrice is not typed
        const maxPriorityFeePerGas = hexToBigInt(fees.maxPriorityFeePerGas);
        return { maxFeePerGas, maxPriorityFeePerGas };
      },
    },
    transport: http(`https://public.pimlico.io/v2/${publicClient.chain?.id ?? 1}/rpc`),
  });

  // Sign authorization for 7702 account
  if (!walletClient.account) throw new Error("No account");
  const authorization = await walletClient.signAuthorization({
    account: walletClient.account,
    chainId: publicClient.chain?.id ?? 1,
    nonce: await publicClient.getTransactionCount({ address: walletClient.account?.address }),
    contractAddress: walletClient.account?.address,
  });
  console.log("authorization", authorization);
  if (!walletClient.account) throw new Error("No account");
  const hash = await bundlerClient.sendUserOperation({
    account: walletClient.account as SmartAccount, // should we fine since we convert eoa to smart account?
    calls: [
      {
        to: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipientAddress, amount],
      },
    ],
    authorization: authorization,
  });
  console.log("hash", hash);
  return hash;
}

export const getUSDCBalance = async (props: {
  walletClient: WalletClient
  publicClient: PublicClient
}) => {
  const { walletClient, publicClient } = props;
  if (!walletClient.account?.address) throw new Error("No account address");
  // 1.3. Check the USDC balance
  const usdc = getContract({ client: publicClient, address: USDC_ADDRESS, abi: erc20Abi });
  const usdcBalance = await usdc.read.balanceOf([walletClient.account?.address]);
  return usdcBalance;
}