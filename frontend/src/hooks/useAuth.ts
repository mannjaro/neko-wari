import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChallengeNameType } from "@aws-sdk/client-cognito-identity-provider";

import {
  respondToAuthChallenge,
  startPasskeyAuth,
  startPasswordAuth,
} from "@/server/auth";
import type {
  AuthResult,
  ChallengeRequest,
  PasskeyAuthRequest,
  PasswordAuthRequest,
} from "@/types/auth";

export const authQueryKey = ["auth"] as const;

type AuthAction =
  | { type: "PASSWORD"; payload: PasswordAuthRequest }
  | { type: "PASSKEY"; payload: PasskeyAuthRequest }
  | { type: "CHALLENGE"; payload: ChallengeRequest };

type AuthMethod = "PASSWORD" | "PASSKEY" | "RESPOND" | null;

export type AuthChallengeState =
  | null
  | ({
      challengeName: ChallengeNameType;
      session: string;
      username: string;
      parameters: Record<string, string | undefined>;
    } & (
      | { type: "NEW_PASSWORD_REQUIRED" }
      | { type: "SMS_MFA" }
      | { type: "SOFTWARE_TOKEN_MFA" }
      | { type: "EMAIL_OTP" }
      | { type: "SMS_OTP" }
      | { type: "PASSKEY" }
      | { type: "UNKNOWN" }
    ));

function resolveChallengeState(
  result: AuthResult | null,
  username: string,
): AuthChallengeState {
  if (!result || result.status !== "CHALLENGE") {
    return null;
  }

  const resolvedUsername = username || result.parameters.USER_ID_FOR_SRP || "";

  const base = {
    challengeName: result.challengeName,
    session: result.session,
    username: resolvedUsername,
    parameters: result.parameters,
  } as const;

  switch (result.challengeName) {
    case ChallengeNameType.NEW_PASSWORD_REQUIRED:
      return { ...base, type: "NEW_PASSWORD_REQUIRED" };
    case ChallengeNameType.SMS_MFA:
      return { ...base, type: "SMS_MFA" };
    case ChallengeNameType.SOFTWARE_TOKEN_MFA:
      return { ...base, type: "SOFTWARE_TOKEN_MFA" };
    case ChallengeNameType.EMAIL_OTP:
      return { ...base, type: "EMAIL_OTP" };
    case ChallengeNameType.SMS_OTP:
      return { ...base, type: "SMS_OTP" };
    case ChallengeNameType.WEB_AUTHN:
      return { ...base, type: "PASSKEY" };
    default:
      return { ...base, type: "UNKNOWN" };
  }
}

export function useAuth() {
  const passwordFn = useServerFn(startPasswordAuth);
  const passkeyFn = useServerFn(startPasskeyAuth);
  const respondFn = useServerFn(respondToAuthChallenge);
  const queryClient = useQueryClient();

  const [authResult, setAuthResult] = useState<AuthResult | null>(null);
  const [activeUsername, setActiveUsername] = useState<string>("");
  const [method, setMethod] = useState<AuthMethod>(null);
  const [error, setError] = useState<Error | null>(null);

  const mutation = useMutation<AuthResult, Error, AuthAction>({
    mutationFn: async (action) => {
      switch (action.type) {
        case "PASSWORD":
          return passwordFn({ data: action.payload });
        case "PASSKEY":
          return passkeyFn({ data: action.payload });
        case "CHALLENGE":
          return respondFn({ data: action.payload });
        default:
          throw new Error("Unsupported authentication action");
      }
    },
    onMutate: (action) => {
      setError(null);

      if (action.type === "PASSWORD") {
        setMethod("PASSWORD");
        setActiveUsername(action.payload.email);
      } else if (action.type === "PASSKEY") {
        setMethod("PASSKEY");
        setActiveUsername(action.payload.username);
      } else {
        setMethod("RESPOND");
        setActiveUsername(action.payload.username);
      }
    },
    onSuccess: (result) => {
      setAuthResult(result);

      if (result.status === "SUCCESS") {
        queryClient.setQueryData(authQueryKey, result.tokens);
      } else {
        queryClient.removeQueries({ queryKey: authQueryKey });
      }
    },
    onError: (err) => {
      setError(err);
      setAuthResult(null);
      queryClient.removeQueries({ queryKey: authQueryKey });
    },
  });

  const challengeState = useMemo(
    () => resolveChallengeState(authResult, activeUsername),
    [authResult, activeUsername],
  );

  const status = useMemo(() => {
    if (mutation.isPending) {
      return "AUTHENTICATING" as const;
    }
    if (authResult?.status === "SUCCESS") {
      return "AUTHENTICATED" as const;
    }
    if (authResult?.status === "CHALLENGE") {
      return "CHALLENGE" as const;
    }
    return "IDLE" as const;
  }, [mutation.isPending, authResult]);

  const authenticateWithPassword = useCallback(
    (payload: PasswordAuthRequest) => {
      mutation.mutate({ type: "PASSWORD", payload });
    },
    [mutation],
  );

  const authenticateWithPasskey = useCallback(
    (payload: PasskeyAuthRequest) => {
      mutation.mutate({ type: "PASSKEY", payload });
    },
    [mutation],
  );

  const respondToChallengeMutation = useCallback(
    (payload: ChallengeRequest) => {
      mutation.mutate({ type: "CHALLENGE", payload });
    },
    [mutation],
  );

  const respondToChallengeAsync = useCallback(
    (payload: ChallengeRequest) =>
      mutation.mutateAsync({ type: "CHALLENGE", payload }),
    [mutation],
  );

  const reset = useCallback(() => {
    mutation.reset();
    setAuthResult(null);
    setActiveUsername("");
    setMethod(null);
    setError(null);
  }, [mutation]);

  return {
    status,
    method,
    data: authResult,
    challenge: challengeState,
    error,
    isPending: mutation.isPending,
    isSuccess: authResult?.status === "SUCCESS",
    username: activeUsername,
    authenticateWithPassword,
    authenticateWithPasskey,
    respondToChallenge: respondToChallengeMutation,
    respondToChallengeAsync,
    reset,
  };
}
