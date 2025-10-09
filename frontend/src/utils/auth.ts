// @ts-expect-error
import { default as AuthenticationHelperWrapper } from "amazon-cognito-identity-js/lib/AuthenticationHelper.js";
// @ts-expect-error
import { default as BigIntegerWrapper } from "amazon-cognito-identity-js/lib/BigInteger.js";
// @ts-expect-error
import { default as DateHelperWrapper } from "amazon-cognito-identity-js/lib/DateHelper.js";

import type {
  AuthenticationHelperType,
  InputType,
  SRPCalculationParams,
  SRPCalculationResult,
  SRPSetupResult,
} from "@/types/auth";
import { AuthError } from "@/types/auth";

const AuthenticationHelper = AuthenticationHelperWrapper.default;
const BigInteger = BigIntegerWrapper.default;
const DateHelper = DateHelperWrapper.default;

export async function calculateSRP_A(
  userPoolName: string,
): Promise<SRPSetupResult> {
  try {
    const authenticationHelper: AuthenticationHelperType =
      new AuthenticationHelper(userPoolName);
    const SRP_A = authenticationHelper.largeAValue.toString(16);

    return { SRP_A, authenticationHelper };
  } catch (error) {
    throw new AuthError(
      "Failed to calculate SRP_A",
      "SRP_CALCULATION_ERROR",
      error,
    );
  }
}

function hexToUint8Array(hex: string): Uint8Array {
  const pairs = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((byte) => parseInt(byte, 16)));
}

export async function hmacSHA256(
  message: string,
  key: string,
  inputType: InputType = "text",
): Promise<string> {
  try {
    const encoder = new TextEncoder();

    const keyData =
      inputType === "hex" ? hexToUint8Array(key) : encoder.encode(key);

    const messageData =
      inputType === "hex" ? hexToUint8Array(message) : encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  } catch (error) {
    throw new AuthError(
      "Failed to calculate HMAC-SHA256",
      "HMAC_CALCULATION_ERROR",
      error,
    );
  }
}

export async function calculatePasswordVerifier(
  params: SRPCalculationParams,
  userPoolName: string,
): Promise<SRPCalculationResult> {
  const { SRP_B, SALT, username, password, secretBlock, authenticationHelper } =
    params;

  try {
    // AuthenticationHelper を使ってパスワード認証キー (HKDF) を計算
    const hkdfResult = { hkdf: undefined as undefined | string };

    authenticationHelper.getPasswordAuthenticationKey(
      username,
      password,
      new BigInteger(SRP_B, 16),
      new BigInteger(SALT, 16),
      (_err: unknown, result?: string) => {
        hkdfResult.hkdf = result;
      },
    );

    if (!hkdfResult.hkdf) {
      throw new AuthError(
        "Failed to get password authentication key",
        "HKDF_CALCULATION_ERROR",
      );
    }

    const dateHelper = new DateHelper();
    const dateNow = dateHelper.getNowString();

    // 署名対象のメッセージを作成
    const msg = Buffer.concat([
      Buffer.from(userPoolName, "utf-8"),
      Buffer.from(username, "utf-8"),
      Buffer.from(secretBlock, "base64"),
      Buffer.from(dateNow, "utf-8"),
    ]);

    const msgHex = msg.toString("hex");
    const hkdfHex = Buffer.from(hkdfResult.hkdf, "base64").toString("hex");

    // HMAC-SHA256 を計算
    const signature = await hmacSHA256(msgHex, hkdfHex, "hex");

    return { signature, dateNow };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError(
      "Failed to calculate password verifier",
      "PASSWORD_VERIFIER_ERROR",
      error,
    );
  }
}
