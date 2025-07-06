import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEoaWalletClient } from "./eoa-hooks";
import { Call, clearDelegation, createPasskeyDelegation, executeWithPasskey, getDelegationStatus } from "./7702";
import React from "react";

export const useCreatePasskeyDelegation = (props: { addLog?: (message: string | React.ReactNode) => void }) => {
  const queryClient = useQueryClient();
  const eoaWalletClient = useEoaWalletClient();
  return useMutation({
    mutationKey: ['createPasskeyDelegation'],
    mutationFn: () => {
      // Use provided walletClient for metamask/cold wallet, otherwise use eoaWalletClient
      if (!eoaWalletClient.data) {
        throw new Error('No wallet client found');
      }
      const client = eoaWalletClient.data;
      return createPasskeyDelegation({ 
        walletClient: client, 
        addLog: props.addLog,
      });
    },
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