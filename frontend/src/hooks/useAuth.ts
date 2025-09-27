import { useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startAuth } from "@/server/auth";
import type { LoginFormData } from "@/types/forms";
export interface AuthState {
  username: string;
  email: string;
  isAuthenticated: boolean;
}

export function useAuth() {
  const loginFn = useServerFn(startAuth);
  const queryClient = useQueryClient();

  const { mutate, data, isSuccess, isPending } = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => {
      return loginFn({
        data: {
          email: email,
          password: password,
        },
      });
    },
    onSuccess: (tokens) => {
      queryClient.setQueryData(["auth"], tokens);
    },
  });
  return {
    mutate,
    data,
    isSuccess,
    isPending,
  };
}
