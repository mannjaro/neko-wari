import { createServerFn } from "@tanstack/react-start";
import { ChallengeNameType } from "@aws-sdk/client-cognito-identity-provider";

import { getAuthConfig } from "@/lib/auth-config";
import { AuthError } from "@/types/auth";
import type {
  ChallengeRequest,
  PasskeyAuthRequest,
  PasswordAuthRequest,
} from "@/types/auth";
import { CognitoAuthService } from "./cognito-auth";

// 認証サービスのインスタンスを作成する関数
export function createAuthService(): CognitoAuthService {
  const config = getAuthConfig();
  return new CognitoAuthService(config);
}

function ensureObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid request payload");
  }

  return input as Record<string, unknown>;
}

function requireString(
  payload: Record<string, unknown>,
  key: string,
  message?: string,
): string {
  const value = payload[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(message ?? `${key} is required`);
  }

  return value;
}

function parseChallengeName(value: unknown): ChallengeNameType {
  if (typeof value !== "string") {
    throw new Error("challengeName is required");
  }

  const normalized = value as ChallengeNameType;
  const validValues = new Set(
    Object.values(ChallengeNameType) as ChallengeNameType[],
  );

  if (!validValues.has(normalized)) {
    throw new Error(`Unsupported challenge type: ${value}`);
  }

  return normalized;
}

function parseAnswers(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    throw new Error("answers must be an object");
  }

  const entries = Object.entries(value as Record<string, unknown>);

  const result: Record<string, string> = {};
  for (const [key, answer] of entries) {
    if (typeof answer === "string" && answer.trim().length > 0) {
      result[key] = answer;
    }
  }

  if (entries.length > 0 && Object.keys(result).length === 0) {
    throw new Error("answers must include at least one non-empty value");
  }

  return result;
}

function parsePasswordPayload(data: unknown): PasswordAuthRequest {
  const payload = ensureObject(data);

  return {
    email: requireString(payload, "email", "email is required"),
    password: requireString(payload, "password", "password is required"),
  };
}

function parsePasskeyPayload(data: unknown): PasskeyAuthRequest {
  const payload = ensureObject(data);

  const username =
    payload.username ?? payload.email ?? payload.user ?? payload.login;

  if (typeof username !== "string" || username.trim().length === 0) {
    throw new Error("username is required");
  }

  return { username };
}

function parseChallengePayload(data: unknown): ChallengeRequest {
  const payload = ensureObject(data);

  const challengeName = parseChallengeName(payload.challengeName);
  const answers = parseAnswers(payload.answers);

  return {
    username: requireString(payload, "username", "username is required"),
    session: requireString(payload, "session", "session is required"),
    challengeName,
    answers,
  };
}

async function runWithAuthService<T>(
  handler: (service: CognitoAuthService) => Promise<T>,
): Promise<T> {
  const authService = createAuthService();

  try {
    return await handler(authService);
  } catch (error) {
    if (error instanceof AuthError) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
    throw error;
  }
}

export const startPasswordAuth = createServerFn({
  method: "POST",
})
  .inputValidator(parsePasswordPayload)
  .handler(async ({ data }) => {
    return runWithAuthService((service) =>
      service.authenticateWithPassword(data.email, data.password),
    );
  });

export const startPasskeyAuth = createServerFn({
  method: "POST",
})
  .inputValidator(parsePasskeyPayload)
  .handler(async ({ data }) => {
    return runWithAuthService((service) =>
      service.startUserAuth(data.username),
    );
  });

export const respondToAuthChallenge = createServerFn({
  method: "POST",
})
  .inputValidator(parseChallengePayload)
  .handler(async ({ data }) => {
    return runWithAuthService((service) =>
      service.respondToChallenge(data),
    );
  });
