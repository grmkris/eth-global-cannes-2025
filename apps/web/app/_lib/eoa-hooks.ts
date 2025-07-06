import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrCreateEoa, clearEoa, getActiveChain, setActiveChain } from "./eoa";
import { sepolia, type Chain } from "viem/chains";
import { type PublicClient } from "viem";

export const useEoaWalletClient = () => {
  const activeChain = useActiveChain();
  return useQuery({
    queryKey: ["eoa-wallet-client"],
    queryFn: () => getOrCreateEoa(activeChain.data ?? sepolia),
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

export const useETHBalance = ({ address, publicClient }: { address?: string; publicClient: PublicClient }) => {
  return useQuery({
    queryKey: ["eth-balance", address, publicClient.chain?.id],
    queryFn: async () => {
      if (!address) return null;
      const balance = await publicClient.getBalance({ address: address as `0x${string}` });
      return balance;
    },
    enabled: !!address && !!publicClient,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};