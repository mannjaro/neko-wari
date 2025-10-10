import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ChallengeNameType } from "@aws-sdk/client-cognito-identity-provider";
import { startAuthentication } from "@simplewebauthn/browser";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
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

function ensureBase64URL(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    if (isoBase64URL.isBase64URL(trimmed)) {
      return isoBase64URL.trimPadding(trimmed as any);
    }

    if (isoBase64URL.isBase64(trimmed)) {
      try {
        const decoded = isoBase64URL.toBuffer(trimmed, "base64");
        return isoBase64URL.fromBuffer(decoded);
      } catch {
        return trimmed;
      }
    }

    return trimmed;
  }

  if (value instanceof Uint8Array) {
    return isoBase64URL.fromBuffer(new Uint8Array(value));
  }

  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    const copied = new Uint8Array(
      Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength)),
    );
    return isoBase64URL.fromBuffer(copied);
  }

  if (value instanceof ArrayBuffer) {
    return isoBase64URL.fromBuffer(new Uint8Array(value));
  }

  return String(value ?? "");
}

function normalizeRequestOptions(
  options: unknown,
): PublicKeyCredentialRequestOptionsJSON | null {
  if (!options) {
    return null;
  }

  const container = options as {
    publicKey?: PublicKeyCredentialRequestOptionsJSON;
  };
  const publicKey =
    container.publicKey ?? (options as PublicKeyCredentialRequestOptionsJSON);

  if (!publicKey?.challenge) {
    return null;
  }

  const allowCredentials = publicKey.allowCredentials?.map((credential) => ({
    ...credential,
    id: ensureBase64URL(credential.id),
  }));

  return {
    ...publicKey,
    challenge: ensureBase64URL(publicKey.challenge),
    allowCredentials,
  };
}

function extractWebAuthnOptions(
  challenge: AuthChallengeState,
): PublicKeyCredentialRequestOptionsJSON | null {
  if (!challenge || challenge.type !== "PASSKEY") {
    return null;
  }

  const candidates = [
    "WEBAUTHN_CREDENTIAL_REQUEST_OPTIONS",
    "webauthnCredentialRequestOptions",
    "PublicKeyCredentialRequestOptions",
    "publicKeyCredentialRequestOptions",
    "credentialOptions",
    "CREDENTIAL_OPTIONS",
    "CREDENTIAL_REQUEST_OPTIONS",
  ];

  for (const key of candidates) {
    const raw = challenge.parameters[key];
    if (!raw) {
      continue;
    }

    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      const normalized = normalizeRequestOptions(parsed);
      if (normalized) {
        return normalized;
      }
    } catch {
      continue;
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
      return;
    }

    try {
      setIsPasskeyProcessing(true);
      setPasskeyError(null);
      const assertion = await startAuthentication({
        optionsJSON: webAuthnOptions,
      });

      const payload = {
        username: resolvedUsername,
        session: challenge.session,
        challengeName: ChallengeNameType.WEB_AUTHN,
        answers: {
          CREDENTIAL: JSON.stringify(assertion),
        },
      };

      await submitChallengeAsync(payload);
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
    if (challenge?.type === "PASSKEY") {
      if (!hasAttemptedPasskey) {
        void handlePasskey();
      }
    } else {
      setPasskeyError(null);
      setIsPasskeyProcessing(false);
      setHasAttemptedPasskey(false);
    }
  }, [challenge, hasAttemptedPasskey, handlePasskey]);

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
  }, [
    challenge,
    handlePasskey,
    isPasskeyProcessing,
    passkeyError,
    webAuthnOptions,
  ]);

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
