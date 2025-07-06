import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEoaWalletClient } from "./eoa-hooks";
import { useActiveChain } from "./eoa-hooks";
import { Call, clearDelegation, createPasskeyDelegation, executeWithPasskey, getDelegationStatus } from "./7702";
import React from "react";

export const useCreatePasskeyDelegation = () => {
  const queryClient = useQueryClient();
  const eoaWalletClient = useEoaWalletClient();
  const activeChain = useActiveChain();
  return useMutation({
    mutationKey: ['createPasskeyDelegation'],
    mutationFn: () => createPasskeyDelegation({ walletClient: eoaWalletClient.data! }),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error(error);
    },
  });
};    

export const useExecuteWithPasskey = (props: { addLog?: (message: string | React.ReactNode) => void }) => {
  const queryClient = useQueryClient();
  const eoaWalletClient = useEoaWalletClient();
  return useMutation({
    mutationKey: ['executeWithPasskey'],
    mutationFn: (variables: { calls: Call[] }) => executeWithPasskey({ walletClient: eoaWalletClient.data!, calls: variables.calls, addLog: props.addLog }),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error(error);
    },
  });
};

export const useGetDelegationStatus = () => {
  return useQuery({
    queryKey: ['delegationStatus'],
    queryFn: () => getDelegationStatus(),
  });
};

export const useClearDelegation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['clearDelegation'],
    mutationFn: () => {
      clearDelegation();
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error(error);
    },
  });
};