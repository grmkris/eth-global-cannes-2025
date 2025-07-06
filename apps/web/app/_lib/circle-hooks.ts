import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUSDCBalance, handleCircle7702Transfer } from "./circle";
import type { WalletClient, PublicClient } from "viem";

export const useCircle7702Transfer = () => {
  const queryClient = useQueryClient();
  return useMutation({  
    mutationFn: handleCircle7702Transfer,
    onSuccess: (data) => {
      console.log("data", data);
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error("error", error);
    },
  });
};

export const useUSDCBalance = (props: {
  walletClient: WalletClient
  publicClient: PublicClient
}) => {
  const { walletClient, publicClient } = props;
  return useQuery({
    queryKey: ["usdc-balance"],
    queryFn: () => getUSDCBalance({ walletClient: walletClient, publicClient: publicClient }),
    enabled: !!walletClient && !!publicClient,
  });
};

