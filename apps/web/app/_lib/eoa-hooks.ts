import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrCreateEoa, clearEoa, getActiveChain, setActiveChain } from "./eoa";
import type { Chain } from "viem";

export const useEoaWalletClient = () => {
  const activeChain = useActiveChain();
  return useQuery({
    queryKey: ["eoa-wallet-client"],
    queryFn: () => getOrCreateEoa(activeChain.data!),
    enabled: !!activeChain.data,
  });
};

export const useClearEoa = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      clearEoa();
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
};

export const useActiveChain = () => {
  return useQuery({
    queryKey: ["active-chain"],
    queryFn: () => getActiveChain(),
  });
};

export const useSetActiveChain = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chain: Chain) => {
      setActiveChain(chain);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
};