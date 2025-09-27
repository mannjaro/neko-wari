import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startAuth } from "@/server/auth";
import type { LoginFormData } from "@/types/forms";

export const authQueryKey = ["auth"] as const;
export interface AuthState {
  username: string;
  email: string;
  isAuthenticated: boolean;
}

export function useAuth() {
  const loginFn = useServerFn(startAuth);
  const queryClient = useQueryClient();

  const { mutate, data, isSuccess, isPending } = useMutation({
    mutationFn: ({ email, password }: LoginFormData) => {
      return loginFn({
        data: {
          email: email,
          password: password,
        },
      });
    },
    onSuccess: (tokens) => {
      queryClient.setQueryData(authQueryKey, tokens);
    },
  });
  return {
    mutate,
    data,
    isSuccess,
    isPending,
  };
}
