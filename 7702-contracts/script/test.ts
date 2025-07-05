import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { keccak256, encodePacked } from "viem";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.OWNER_PRIVATE_KEY) {
  throw new Error("OWNER_PRIVATE_KEY is not set");
}

const eoa = privateKeyToAccount(process.env.OWNER_PRIVATE_KEY as `0x${string}`);

async function main() {
  const contractAddress = "0x40e03c561eCC97aA2A44C2A1453fFBF4305CccC7";
  let abi =
    require("../../7702-contracts/out/BatchCallAndSponsor.sol/BatchCallAndSponsor.json").abi;

  const relay = eoa;

  const walletClient = createWalletClient({
    account: relay,
    chain: sepolia,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  // // Create Call objects - example calls
  // const calls = [
  //   {
  //     to: "0x93998AB1fC2D04fB7A1430073FD95434067F57e1", // Replace with actual target address
  //     value: BigInt(1000000000000000), // 0.001 ETH (use BigInt for uint256)
  //     data: "0x", // Empty calldata, replace with actual function call data
  //   },
  //   // Add more calls as needed
  // ];

  // Get the current nonce from the contract
  const currentNonce = await publicClient.getTransactionCount({
    address: eoa.address,
  });

  console.log("Current nonce:", currentNonce);

  // 1. Authorize designation of the Contract onto the EOA.
  const prepedAuthorization = await walletClient.prepareAuthorization({
    account: eoa,
    contractAddress,
    nonce: currentNonce,
  });
  console.log("Prepared authorization:", prepedAuthorization);

  const signedAuthorization =
    await walletClient.signAuthorization(prepedAuthorization);
  console.log("Signed authorization:", signedAuthorization);

  // // 2. Create signature for the batch calls
  // // The contract expects: keccak256(abi.encodePacked(nonce, encodedCalls))
  // // where encodedCalls is the concatenation of (to, value, data) for each call
  // let encodedCalls = "0x" as `0x${string}`;
  // for (const call of calls) {
  //   const encoded = encodePacked(
  //     ["address", "uint256", "bytes"],
  //     [call.to as `0x${string}`, call.value, call.data as `0x${string}`]
  //   );
  //   encodedCalls = (encodedCalls + encoded.slice(2)) as `0x${string}`;
  // }

  // const digest = keccak256(
  //   encodePacked(["uint256", "bytes"], [currentNonce, encodedCalls])
  // );

  // // Sign the digest with the EOA's private key
  // const signature = await eoa.signMessage({
  //   message: { raw: digest },
  // });

  // console.log("Batch signature:", signature);

  // 3. Execute the batch calls with authorization
  const hash = await walletClient.writeContract({
    abi,
    address: eoa.address, // Call the EOA address (which will be upgraded)
    authorizationList: [signedAuthorization],
    functionName: "test",
    args: [123], // Pass both calls and signature
    chain: sepolia,
    nonce: currentNonce,
    account: eoa,
  });

  console.log("Transaction hash:", hash);
}

main();
