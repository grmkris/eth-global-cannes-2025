import { useQuery } from "@tanstack/react-query";
import { generateStealthAddress } from "./stealth-address";
import { useEoaWalletClient } from "./eoa-hooks";

export const useStealthAddress = () => {
  const currentWalletClient = useEoaWalletClient();

  if (!currentWalletClient) {
    throw new Error("No wallet client found");
  }

  return useQuery({
    queryKey: ["stealth-address"],
    queryFn: () => generateStealthAddress(currentWalletClient.data!, 11155111),
    enabled: !!currentWalletClient.data,
  })
};