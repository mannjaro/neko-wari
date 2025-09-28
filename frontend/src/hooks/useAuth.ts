import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startAuth } from "@/server/auth";
import type { AuthRequest, AuthResult } from "@/types/auth";

export const authQueryKey = ["auth"] as const;
export interface AuthState {
  username: string;
  email: string;
  isAuthenticated: boolean;
}

export function useAuth() {
  const loginFn = useServerFn(startAuth);
  const queryClient = useQueryClient();

  const { mutate, data, error, isSuccess, isPending, reset } = useMutation<
    AuthResult,
    Error,
    AuthRequest
  >({
    mutationFn: (payload) => {
      return loginFn({ data: payload });
    },
    onSuccess: (result) => {
      if (result.status === "SUCCESS") {
        console.log(result.tokens);
        queryClient.setQueryData(authQueryKey, result.tokens);
      } else {
        queryClient.removeQueries({ queryKey: authQueryKey });
      }
    },
  });
  return {
    mutate,
    data,
    error,
    isSuccess: data?.status === "SUCCESS" && isSuccess,
    isPending,
    reset,
  };
}
