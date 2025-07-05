import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { recoverAddress } from "viem";
import { hashAuthorization } from "viem/utils";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.OWNER_PRIVATE_KEY) {
  throw new Error("OWNER_PRIVATE_KEY is not set");
}

const eoa = privateKeyToAccount(process.env.OWNER_PRIVATE_KEY as `0x${string}`);

async function verifyAuthorization() {
  const contractAddress = "0x40e03c561eCC97aA2A44C2A1453fFBF4305CccC7";

  const walletClient = createWalletClient({
    account: eoa,
    chain: sepolia,
    transport: http(),
  });

  console.log("=== Creating Authorization ===");
  console.log("EOA address:", eoa.address);
  console.log("Contract address:", contractAddress);
  console.log("Chain ID:", sepolia.id);

  // 1. Create the authorization
  const prepedAuthorization = await walletClient.prepareAuthorization({
    account: eoa,
    contractAddress,
  });
  console.log("Prepared authorization:", prepedAuthorization);

  const signedAuthorization =
    await walletClient.signAuthorization(prepedAuthorization);
  console.log("Signed authorization:", signedAuthorization);

  // 2. Verify the authorization signature using viem's hashAuthorization
  console.log("\n=== Verifying Authorization ===");

  // Use viem's built-in hashAuthorization function
  const messageHash = hashAuthorization({
    chainId: signedAuthorization.chainId,
    contractAddress: signedAuthorization.address,
    nonce: signedAuthorization.nonce,
  });

  console.log("Message hash:", messageHash);

  // Reconstruct the signature from r, s, yParity
  const signature =
    `0x${signedAuthorization.r.slice(2)}${signedAuthorization.s.slice(2)}${signedAuthorization.yParity?.toString(16).padStart(2, "0")}` as `0x${string}`;
  console.log("Reconstructed signature:", signature);

  try {
    // Recover the address from the signature
    const recoveredAddress = await recoverAddress({
      hash: messageHash,
      signature: signature,
    });

    console.log("Recovered address:", recoveredAddress);
    console.log("Expected address (EOA):", eoa.address);
    console.log(
      "Addresses match:",
      recoveredAddress.toLowerCase() === eoa.address.toLowerCase()
    );

    if (recoveredAddress.toLowerCase() === eoa.address.toLowerCase()) {
      console.log("✅ Authorization signature is VALID!");
    } else {
      console.log("❌ Authorization signature is INVALID!");
    }

    // Additional checks
    console.log("\n=== Additional Validation ===");
    console.log(
      "Chain ID matches:",
      signedAuthorization.chainId === sepolia.id
    );
    console.log(
      "Contract address matches:",
      signedAuthorization.address.toLowerCase() ===
        contractAddress.toLowerCase()
    );
  } catch (error) {
    console.error("Error verifying signature:", error);
  }
}

verifyAuthorization();

async function verifyAuthorizationFromParams(
  signedAuthorization: {
    chainId: number;
    address: `0x${string}`;
    nonce: number;
    r: `0x${string}`;
    s: `0x${string}`;
    yParity: number;
  },
  expectedEOAAddress: `0x${string}`,
  contractAddress: `0x${string}`
) {
  console.log("=== Verifying Authorization From Parameters ===");
  console.log("Expected EOA address:", expectedEOAAddress);
  console.log("Contract address:", contractAddress);
  console.log("Chain ID:", signedAuthorization.chainId);
  console.log("Signed authorization:", signedAuthorization);

  // Use viem's built-in hashAuthorization function
  const messageHash = hashAuthorization({
    chainId: signedAuthorization.chainId,
    contractAddress: signedAuthorization.address,
    nonce: signedAuthorization.nonce,
  });

  console.log("Message hash:", messageHash);

  // Reconstruct the signature from r, s, yParity
  const signature =
    `0x${signedAuthorization.r.slice(2)}${signedAuthorization.s.slice(2)}${signedAuthorization.yParity?.toString(16).padStart(2, "0")}` as `0x${string}`;
  console.log("Reconstructed signature:", signature);

  try {
    // Recover the address from the signature
    const recoveredAddress = await recoverAddress({
      hash: messageHash,
      signature: signature,
    });

    console.log("Recovered address:", recoveredAddress);
    console.log("Expected address (EOA):", expectedEOAAddress);
    console.log(
      "Addresses match:",
      recoveredAddress.toLowerCase() === expectedEOAAddress.toLowerCase()
    );

    if (recoveredAddress.toLowerCase() === expectedEOAAddress.toLowerCase()) {
      console.log("✅ Authorization signature is VALID!");
    } else {
      console.log("❌ Authorization signature is INVALID!");
    }

    // Additional checks
    console.log("\n=== Additional Validation ===");
    console.log(
      "Contract address matches:",
      signedAuthorization.address.toLowerCase() ===
        contractAddress.toLowerCase()
    );

    return {
      isValid:
        recoveredAddress.toLowerCase() === expectedEOAAddress.toLowerCase(),
      recoveredAddress,
      expectedAddress: expectedEOAAddress,
      contractAddressMatches:
        signedAuthorization.address.toLowerCase() ===
        contractAddress.toLowerCase(),
    };
  } catch (error) {
    console.error("Error verifying signature:", error);
    return {
      isValid: false,
      error: error,
      recoveredAddress: null,
      expectedAddress: expectedEOAAddress,
      contractAddressMatches: false,
    };
  }
}

// Export the new function for use in other modules
export { verifyAuthorizationFromParams };
