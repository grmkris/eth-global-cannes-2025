import { generateStealthMetaAddressFromSignature, generateStealthAddress as generateStealthAddressScopeLift } from "@scopelift/stealth-address-sdk";
import type { WalletClient } from "viem";

export async function generateStealthAddress(walletClient: WalletClient, chainId: number): Promise<`0x${string}` | null> {
  try {
    const account = walletClient.account?.address;
    if (!account) throw new Error("No account connected");

    const message = `Generate Stealth Meta-Address on ${chainId} chain`;
    
    const signature = await walletClient.account.signMessage({
      message: { raw: message as `0x${string}` },
      account: account,
    });
    console.log("signature", signature)

    const stealthMetaAddress = generateStealthMetaAddressFromSignature(signature);
    
    const result = generateStealthAddressScopeLift({ stealthMetaAddressURI: stealthMetaAddress });
    return result.stealthAddress;
  } catch (error) {
    console.error("Failed to generate stealth address:", error);
    return null;
  }
}