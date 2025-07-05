import { secp256k1 } from "@noble/curves/secp256k1";
import {
  concatHex,
  createWalletClient,
  http,
  keccak256,
  numberToHex,
  toRlp,
} from "viem";
import type { Address } from "abitype";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import dotenv from "dotenv";
import { verifyAuthorizationFromParams } from "./verify-auth";

dotenv.config();

export async function signAuthorization(
  chainId: number,
  nonce: number,
  privateKey: string,
  address: Address
) {
  const signature = await sign({
    hash: hashAuthorization(chainId, nonce, address),
    privateKey,
  });
  return {
    address,
    chainId,
    nonce,
    ...signature,
  };
}

export function hashAuthorization(
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

async function TestSignAuthorization() {
  const eoa = privateKeyToAccount(
    process.env.USER_PRIVATE_KEY as `0x${string}`
  );
  const walletClient = createWalletClient({
    account: eoa,
    chain: sepolia,
    transport: http(),
  });

  const contractAddress = "0x40e03c561eCC97aA2A44C2A1453fFBF4305CccC7";
  const currentNonce = 5;

  const prepedAuthorization = await walletClient.prepareAuthorization({
    account: eoa,
    contractAddress,
    nonce: currentNonce,
    executor: "self",
  });
  console.log("Prepared authorization:", prepedAuthorization);

  const signedAuthorization =
    await walletClient.signAuthorization(prepedAuthorization);
  console.log("Signed authorization:", signedAuthorization);

  const signedAuthorization2 = await signAuthorization(
    sepolia.id,
    currentNonce,
    process.env.USER_PRIVATE_KEY as `0x${string}`,
    contractAddress
  );
  console.log("Signed authorization 2:", signedAuthorization2);

  const ok1 = await verifyAuthorizationFromParams(
    {
      chainId: sepolia.id,
      address: eoa.address,
      nonce: currentNonce,
      r: signedAuthorization.r,
      s: signedAuthorization.s,
      yParity: signedAuthorization.yParity ?? 0,
    },
    eoa.address,
    contractAddress
  );

  const ok2 = await verifyAuthorizationFromParams(
    signedAuthorization2,
    eoa.address,
    contractAddress
  );

  console.log("ok1", ok1);
  console.log("ok2", ok2);
}

TestSignAuthorization();
