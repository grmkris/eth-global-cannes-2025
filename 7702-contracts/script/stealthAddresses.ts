import {
  computeStealthKey,
  createStealthClient,
  generateKeysFromSignature,
  generateStealthAddress,
} from "@scopelift/stealth-address-sdk";
import { VALID_SCHEME_ID } from "@scopelift/stealth-address-sdk";

import { generateStealthMetaAddressFromSignature } from "@scopelift/stealth-address-sdk";

import * as dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";

dotenv.config();

const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;

const stealthClient = createStealthClient({
  chainId: 11155111,
  rpcUrl: process.env.SEPOLIA_RPC_URL as string,
});

function generateAddresses() {
  const signature =
    "0x0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000111"; // Todo: signature
  console.log(signature);
  const newKeys = generateKeysFromSignature(signature);
  const stealthMetaAddress = generateStealthMetaAddressFromSignature(signature);

  const details = generateStealthAddress({
    stealthMetaAddressURI: stealthMetaAddress,
    schemeId: 1,
  });

  console.log(newKeys);
  console.log(details);

  const stealthPrivKey = getStealthAddressPrivateKey(details, newKeys);
  console.log(stealthPrivKey);

  const stealthAddressAccount = privateKeyToAccount(stealthPrivKey);
  console.log(stealthAddressAccount);

  return {
    newKeys,
    stealthMetaAddress,
  };
}

function getStealthAddressPrivateKey(stealthAddressDetails: any, keys: any) {
  const stealthPrivateKey = computeStealthKey({
    schemeId: 1,
    ephemeralPublicKey: stealthAddressDetails.ephemeralPublicKey,
    spendingPrivateKey: keys.spendingPrivateKey,
    viewingPrivateKey: keys.viewingPrivateKey,
  });

  return stealthPrivateKey;
}

async function getAnnouncementsForUser(keys: any) {
  const announcements = await stealthClient.getAnnouncements({
    ERC5564Address: process.env.ERC5564_ANNOUNCER as `0x${string}`,
    args: {},
    fromBlock: 8675000n,
  });

  const userAnnouncements = await stealthClient.getAnnouncementsForUser({
    announcements,
    spendingPublicKey: keys.spendingPublicKey,
    viewingPrivateKey: keys.viewingPrivateKey,
    excludeList: [],
    includeList: [],
  });

  console.log(userAnnouncements);
  return userAnnouncements;
}

generateAddresses();
