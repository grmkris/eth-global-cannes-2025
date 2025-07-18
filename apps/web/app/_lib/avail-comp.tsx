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

import { useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/button";

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
          <Button
            onClick={async () => {
              console.log("bridge")
              const bridgeResult = await nexusSDK?.bridge({
                token: "USDC",
                amount: 1,
                chainId: 11155420, // to Optimism sepolia
              });
              console.log(bridgeResult);
            }}
            disabled={!nexusSDK}
          >
            Bridge
          </Button>
        </div>
      </div>
    </NexusProvider>
  );
};
