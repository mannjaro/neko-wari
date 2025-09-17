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

  const mutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => {
      return loginFn({
        data: {
          email: email,
          password: password,
        },
      });
    },
  });
  queryClient.fetchQuery;
  return useCallback(
    async (_data: LoginFormData) => {
      const result = await loginFn({
        data: {
          email: _data.email,
          password: _data.password,
        },
      });
      return result;
    },
    [loginFn]
  );
}
