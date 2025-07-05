import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.OWNER_PRIVATE_KEY) {
  throw new Error("OWNER_PRIVATE_KEY is not set");
}

const eoa = privateKeyToAccount(process.env.OWNER_PRIVATE_KEY as `0x${string}`);

async function main() {
  const contractAddress = "0x6990aCe3e222Ac4901B713958716Bda39D709a6c";
  let abi =
    require("../../7702-contracts/out/BatchCallAndSponsor.sol/BatchCallAndSponsor.json").abi;

  const relay = eoa;

  const walletClient = createWalletClient({
    account: relay,
    chain: sepolia,
    transport: http(),
  });

  // Create Call objects - example calls
  const calls = [
    {
      to: "0x93998AB1fC2D04fB7A1430073FD95434067F57e1", // Replace with actual target address
      value: BigInt(1000000000000000), // 0.001 ETH (use BigInt for uint256)
      data: "0x", // Empty calldata, replace with actual function call data
    },
    // Add more calls as needed
  ];

  // 1. Authorize designation of the Contract onto the EOA.
  // const authorization = await walletClient.signAuthorization({

  //   nonce: 7,
  // });

  const prepedAuthorization = await walletClient.prepareAuthorization({
    account: eoa,
    contractAddress,
  });
  console.log(prepedAuthorization);

  const signedAuthorization =
    await walletClient.signAuthorization(prepedAuthorization);
  console.log(signedAuthorization);

  // 2. Designate the Contract on the EOA, and invoke the
  //    `execute` function.
  const hash = await walletClient.writeContract({
    abi,
    authorizationList: [signedAuthorization],
    functionName: "execute",
    args: [calls], // Pass the calls array
    chain: sepolia,
    account: eoa,
    address: eoa.address,
    // accessList: [],
  });

  console.log(hash);
}

main();
