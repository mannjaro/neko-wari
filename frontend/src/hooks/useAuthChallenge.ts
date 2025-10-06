import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ChallengeNameType } from "@aws-sdk/client-cognito-identity-provider";
import { startAuthentication } from "@simplewebauthn/browser";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/types";

import type { ChallengeRequest } from "@/types/auth";
import type { AuthChallengeState } from "./useAuth";

const DEFAULT_VALUES = {
  newPassword: "",
  confirmPassword: "",
  code: "",
} as const;

export interface ChallengeFormValues {
  newPassword: string;
  confirmPassword: string;
  code: string;
}

interface UseAuthChallengeOptions {
  challenge: AuthChallengeState;
  submitChallenge: (payload: ChallengeRequest) => void;
  submitChallengeAsync: (payload: ChallengeRequest) => Promise<unknown>;
  isPending: boolean;
}

interface PasskeyState {
  isProcessing: boolean;
  error: string | null;
  hasOptions: boolean;
  retry: () => Promise<void>;
}

const PASSKEY_PARAM_KEYS = [
  "WEBAUTHN_CREDENTIAL_REQUEST_OPTIONS",
  "webauthnCredentialRequestOptions",
  "PublicKeyCredentialRequestOptions",
  "publicKeyCredentialRequestOptions",
  "credentialOptions",
  "CREDENTIAL_OPTIONS",
] as const;

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function decodeBase64(value: string): string | null {
  try {
    const atobFn = (globalThis as { atob?: (input: string) => string }).atob;
    if (typeof atobFn === "function") {
      return atobFn(value);
    }
  } catch {
    // noop – fall back to Buffer if available
  }

  const bufferCtor = (globalThis as { Buffer?: any }).Buffer;
  if (bufferCtor) {
    try {
      return bufferCtor.from(value, "base64").toString("utf-8");
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeBinary(input: unknown): string | null {
  if (typeof input === "string") {
    const trimmed = input.trim();
    return trimmed ? trimmed : null;
  }

  if (input instanceof Uint8Array) {
    return toBase64Url(input);
  }

  if (Array.isArray(input)) {
    return toBase64Url(Uint8Array.from(input));
  }

  if (input instanceof ArrayBuffer) {
    return toBase64Url(new Uint8Array(input));
  }

  if (ArrayBuffer.isView(input)) {
    const view = input as ArrayBufferView;
    return toBase64Url(
      new Uint8Array(view.buffer, view.byteOffset, view.byteLength),
    );
  }

  return null;
}

function toBase64Url(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    return "";
  }

  try {
    const btoaFn = (globalThis as { btoa?: (data: string) => string }).btoa;
    if (typeof btoaFn === "function") {
      let binary = "";
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      const base64 = btoaFn(binary);
      return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
  } catch {
    // Ignore and fall back to Buffer
  }

  const bufferCtor = (globalThis as { Buffer?: any }).Buffer;
  if (bufferCtor) {
    try {
      return bufferCtor
        .from(bytes)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    } catch {
      // fall through
    }
  }

  // As a last resort, return a hex string to keep the value stable
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function parseCredentialOptions(
  raw: unknown,
): PublicKeyCredentialRequestOptionsJSON | null {
  if (!raw) {
    return null;
  }

  const candidate =
    typeof raw === "string"
      ? tryParseJson(raw) ?? tryParseJson(decodeBase64(raw) ?? "")
      : raw;

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const withPublicKey = candidate as {
    publicKey?: PublicKeyCredentialRequestOptionsJSON;
  };
  const publicKey = withPublicKey.publicKey ?? candidate;

  if (!publicKey || typeof publicKey !== "object") {
    return null;
  }

  const challenge = normalizeBinary((publicKey as any).challenge);
  if (!challenge) {
    return null;
  }

  const allowCredentials = Array.isArray((publicKey as any).allowCredentials)
    ? (publicKey as any).allowCredentials
        .map((item: any) => {
          const id = normalizeBinary(item?.id);
          if (!id) {
            return null;
          }
          return {
            ...item,
            id,
          };
        })
        .filter(Boolean)
    : undefined;

  return {
    ...(publicKey as PublicKeyCredentialRequestOptionsJSON),
    challenge,
    allowCredentials: allowCredentials as
      | PublicKeyCredentialRequestOptionsJSON["allowCredentials"]
      | undefined,
  };
}

function extractWebAuthnOptions(
  challenge: AuthChallengeState,
): PublicKeyCredentialRequestOptionsJSON | null {
  if (!challenge || challenge.type !== "PASSKEY") {
    return null;
  }

  for (const key of PASSKEY_PARAM_KEYS) {
    const raw = challenge.parameters[key];
    const options = parseCredentialOptions(raw);
    if (options) {
      return options;
    }
  }

  return null;
}

function buildAnswers(
  challenge: AuthChallengeState,
  values: ChallengeFormValues,
  setError: ReturnType<typeof useForm<ChallengeFormValues>>["setError"],
): Record<string, string> | null {
  if (!challenge) {
    return null;
  }

  const answers: Record<string, string> = {};

  switch (challenge.type) {
    case "NEW_PASSWORD_REQUIRED": {
      if (values.newPassword !== values.confirmPassword) {
        setError("confirmPassword", {
          type: "validate",
          message: "新しいパスワードが一致しません",
        });
        return null;
      }
      if (!values.newPassword) {
        setError("newPassword", {
          type: "validate",
          message: "新しいパスワードを入力してください",
        });
        return null;
      }
      answers.NEW_PASSWORD = values.newPassword;
      break;
    }
    case "SMS_MFA": {
      if (!values.code) {
        setError("code", {
          type: "validate",
          message: "コードを入力してください",
        });
        return null;
      }
      answers.SMS_MFA_CODE = values.code;
      break;
    }
    case "SOFTWARE_TOKEN_MFA": {
      if (!values.code) {
        setError("code", {
          type: "validate",
          message: "コードを入力してください",
        });
        return null;
      }
      answers.SOFTWARE_TOKEN_MFA_CODE = values.code;
      break;
    }
    case "EMAIL_OTP": {
      if (!values.code) {
        setError("code", {
          type: "validate",
          message: "コードを入力してください",
        });
        return null;
      }
      answers.EMAIL_OTP_CODE = values.code;
      break;
    }
    case "SMS_OTP": {
      if (!values.code) {
        setError("code", {
          type: "validate",
          message: "コードを入力してください",
        });
        return null;
      }
      answers.OTP = values.code;
      break;
    }
    case "PASSKEY":
      return null;
    default: {
      if (values.code) {
        answers.ANSWER = values.code;
      } else {
        setError("code", {
          type: "validate",
          message: "コードを入力してください",
        });
        return null;
      }
      break;
    }
  }

  return answers;
}

export function useAuthChallenge({
  challenge,
  submitChallenge,
  submitChallengeAsync,
  isPending,
}: UseAuthChallengeOptions) {
  const challengeForm = useForm<ChallengeFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [isPasskeyProcessing, setIsPasskeyProcessing] = useState(false);
  const [hasAttemptedPasskey, setHasAttemptedPasskey] = useState(false);

  const webAuthnOptions = useMemo(
    () => extractWebAuthnOptions(challenge),
    [challenge],
  );

  useEffect(() => {
    if (!challenge) {
      challengeForm.reset(DEFAULT_VALUES);
      setPasskeyError(null);
      setIsPasskeyProcessing(false);
      setHasAttemptedPasskey(false);
    }
  }, [challenge, challengeForm]);

  const resolvedUsername = challenge?.username ?? "";

  const handlePasskey = useCallback(async () => {
    if (!challenge || challenge.type !== "PASSKEY") {
      return;
    }

    if (!resolvedUsername) {
      setPasskeyError(
        "ユーザー名が特定できません。最初からやり直してください。",
      );
      return;
    }

    if (!webAuthnOptions) {
      setPasskeyError("Passkeyのチャレンジ情報を解析できませんでした。");
      setHasAttemptedPasskey(true);
      return;
    }

    try {
      setIsPasskeyProcessing(true);
      setPasskeyError(null);
      const assertion = await startAuthentication({
        optionsJSON: webAuthnOptions,
      });

      await submitChallengeAsync({
        username: resolvedUsername,
        session: challenge.session,
        challengeName: ChallengeNameType.WEB_AUTHN,
        answers: {
          WEB_AUTHN_ASSERTION: JSON.stringify(assertion),
        },
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setPasskeyError("Passkey認証がユーザー操作でキャンセルされました。");
      } else if (error instanceof Error) {
        setPasskeyError(error.message || "Passkey認証に失敗しました。");
      } else {
        setPasskeyError("Passkey認証に失敗しました。");
      }
    } finally {
      setIsPasskeyProcessing(false);
      setHasAttemptedPasskey(true);
    }
  }, [challenge, resolvedUsername, submitChallengeAsync, webAuthnOptions]);

  useEffect(() => {
    if (challenge?.type === "PASSKEY" && !hasAttemptedPasskey) {
      void handlePasskey();
    }
  }, [challenge, handlePasskey, hasAttemptedPasskey]);

  const handleSubmit = challengeForm.handleSubmit((values) => {
    if (!challenge || challenge.type === "PASSKEY") {
      return;
    }

    if (!resolvedUsername) {
      const field =
        challenge.challengeName === ChallengeNameType.NEW_PASSWORD_REQUIRED
          ? "newPassword"
          : "code";
      challengeForm.setError(field as keyof ChallengeFormValues, {
        type: "validate",
        message: "ユーザー名が特定できません。最初からやり直してください。",
      });
      return;
    }

    const answers = buildAnswers(challenge, values, challengeForm.setError);

    if (!answers) {
      return;
    }

    submitChallenge({
      username: resolvedUsername,
      session: challenge.session,
      challengeName: challenge.challengeName,
      answers,
    });

    challengeForm.reset(DEFAULT_VALUES);
  });

  const resetForm = useCallback(() => {
    challengeForm.reset(DEFAULT_VALUES);
  }, [challengeForm]);

  const passkeyState: PasskeyState | null = useMemo(() => {
    if (!challenge || challenge.type !== "PASSKEY") {
      return null;
    }

    return {
      isProcessing: isPasskeyProcessing,
      error: passkeyError,
      hasOptions: Boolean(webAuthnOptions),
      retry: handlePasskey,
    };
  }, [challenge, handlePasskey, isPasskeyProcessing, passkeyError, webAuthnOptions]);

  return {
    challenge,
    form: challengeForm,
    resolvedUsername,
    handleSubmit,
    resetForm,
    isPending,
    shouldRenderForm: Boolean(challenge && challenge.type !== "PASSKEY"),
    passkey: passkeyState,
  };
}
