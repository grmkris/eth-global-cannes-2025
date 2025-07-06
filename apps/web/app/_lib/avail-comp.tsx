import { useQuery } from "@tanstack/react-query";
import { getProvider, initializeAvail } from "./avail";
import { useEoaWalletClient } from "./eoa-hooks";
import {
  EthereumProvider,
  NexusSDK,
  RequestArguments,
  BridgeButton,
  NexusProvider,
} from "@avail-project/nexus";

import { createWalletClient, custom } from "viem";
import { mainnet } from "viem/chains";
import { useEffect, useState } from "react";

export const AvailComponent = () => {
  const wc = useEoaWalletClient();

  // const avail = useQuery({
  //   queryKey: ["avail"],
  //   queryFn: () => initializeAvail(provider),
  // });

  const [nexusSDK, setNexusSDK] = useState<NexusSDK | null>(null);
  useEffect(() => {
    const provider = getProvider();

    const fetchSDK = async () => {
      const sdk = await initializeAvail(provider);
      setNexusSDK(sdk);
    };
    fetchSDK();
  }, []);

  return (
    <NexusProvider
      config={{
        network: "testnet",
        debug: true,
      }}
    >
      <div>
        AvailComponent
        <div>
          <button
            onClick={async () => {
              const balances = await nexusSDK?.getUnifiedBalances();
              console.log(balances);
            }}
            disabled={!nexusSDK}
          >
            Get Balances
          </button>
        </div>
        <div>
          <button
            onClick={async () => {
              const transferResult = await nexusSDK?.transfer({
                token: "ETH",
                amount: 0.1,
                chainId: 421614,
                recipient: "0x2E61D8b5FcE5616980e039906cc1f212f44f5168",
              });
              console.log(transferResult);
            }}
            disabled={!nexusSDK}
          >
            Transfer
          </button>
        </div>
        <div>
          <button
            onClick={async () => {
              const bridgeResult = await nexusSDK?.bridge({
                token: "ETH",
                amount: 0.01,
                chainId: 421614, // to Arbitrum sepolia
              });
              console.log(bridgeResult);
            }}
            disabled={!nexusSDK}
          >
            Bridge
          </button>
        </div>
      </div>
    </NexusProvider>
  );
};
