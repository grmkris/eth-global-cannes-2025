import { sepolia } from "viem/chains";
import {
  createLedgerAuthorization,
  sendLedgerTransactionWithAuthorization,
} from "./ledger-eip-7702";
import { privateKeyToAccount } from "viem/accounts";
import { secp256k1 } from "@noble/curves/secp256k1";
import {
  Address,
  concatHex,
  createPublicClient,
  createWalletClient,
  Hex,
  http,
  keccak256,
  numberToHex,
  parseEther,
  toRlp,
  TransactionSerializable,
} from "viem";
import { hashAuthorization } from "ethers";
import { signTransactionLedger } from "../lib/ledgerService";

async function TestLedgerSigning() {
  const testPrivKey =
    "0x8cdc6b8b8cc3eb38b52131303e28ed7840b7e2089dbcf3bb33e9e4d6aa6437ea";
  const contractAddress = "0x55649E01B5Df198D18D95b5cc5051630cfD45564";

  const eoa = privateKeyToAccount(testPrivKey as `0x${string}`);

  const walletClient = createWalletClient({
    account: eoa,
    chain: sepolia,
    transport: http(),
  });
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  //   Get the current nonce from the contract
  let currentNonce = await publicClient.getTransactionCount({
    address: eoa.address,
  });

  //   const prepedAuthorization = await walletClient.prepareAuthorization({
  //     account: eoa,
  //     contractAddress: contractAddress as `0x${string}`,
  //     nonce: currentNonce,
  //     executor: "self",
  //   });

//   console.log(
//     "authorization:",
//     hashAuthorization2(
//       sepolia.id,
//       currentNonce,
//       contractAddress as `0x${string}`
//     )
//   );

  const signedAuthorization = await walletClient.signAuthorization({
    account: eoa,
    contractAddress: contractAddress as `0x${string}`,
    nonce: currentNonce,
    executor: "self",
    chainId: sepolia.id,
    address: eoa.address,
  });
//   console.log("Signed authorization:", signedAuthorization);

  const hash = await walletClient.sendTransaction({
    to: eoa.address,
    value: parseEther("0.001"),
    data: "0x",
    address: eoa.address, // Call the EOA address (which will be upgraded)
    authorizationList: [signedAuthorization],
    chain: sepolia,
    nonce: currentNonce,
  });

//   console.log("Transaction hash:", hash);

  // * ================================================================
  // * ================================================================

//   console.log("\n==========================================\n");

  //   const authorization = await createLedgerAuthorization({
  //     contractAddress: contractAddress,
  //     chainId: 11155111,
  //     chain: sepolia,
  //     nonce: currentNonce,
  //   });

  const hash1 = hashAuthorization({
    chainId: sepolia.id,
    address: contractAddress,
    nonce: currentNonce,
  });

//   console.log("Hash:", hash1);

  const signature = await sign({
    hash: hash1,
    privateKey: testPrivKey,
  });

//   console.log("Signature:", signature);

  const authorization2 = {
    chainId: sepolia.id,
    contractAddress: contractAddress as `0x${string}`,
    nonce: currentNonce,
    address: eoa.address as Address,
    r: signature.r as Hex,
    s: signature.s as Hex,
    v: signature.v,
    yParity: signature.yParity,
  };

  //   const res = await sendLedgerTransactionWithAuthorization({
  //     chain: sepolia,
  //     authorization: authorization2,
  //     to: eoa.address,
  //     value: parseEther("0.001"),
  //     data: "0x",
  //   });
  //   console.log("Res:", res);

  //   Get the current nonce from the contract
  currentNonce = await publicClient.getTransactionCount({
    address: eoa.address,
  });

  const transaction: TransactionSerializable = {
    to: eoa.address,
    value: parseEther("0.001"),
    data: "0x",
    authorizationList: [authorization2],
    chainId: sepolia.id,
    gas: 500000n,
    maxFeePerGas: 3500000n,
    maxPriorityFeePerGas: 3000000n,
    nonce: currentNonce,
  };

  const signedTx = await signTransactionLedger(transaction, testPrivKey);
//   console.log("Signed transaction:", signedTx);

  const hash2 = await publicClient.sendRawTransaction({
    serializedTransaction: signedTx,
  });
  console.log("Hash2:", hash2);
}

TestLedgerSigning();

export function hashAuthorization2(
  chainId: number,
  nonce: number,
  contractAddress: Address
) {
  const hash = keccak256(
    concatHex([
      "0x05",
      toRlp([
        chainId ? numberToHex(chainId) : "0x",
        contractAddress,
        nonce ? numberToHex(nonce) : "0x",
      ]),
    ])
  );
  return hash;
}

export async function sign({
  hash,
  privateKey,
}: {
  hash: string;
  privateKey: string;
}) {
  const { r, s, recovery } = secp256k1.sign(
    hash.slice(2),
    privateKey.slice(2),
    { lowS: true, extraEntropy: true }
  );
  const signature = {
    r: numberToHex(r, { size: 32 }),
    s: numberToHex(s, { size: 32 }),
    v: recovery ? 28n : 27n,
    yParity: recovery,
  };
  return signature;
}
