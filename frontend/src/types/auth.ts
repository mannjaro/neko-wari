export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

export interface AuthConfig {
  userPoolId: string;
  clientId: string;
  region: string;
  userPoolName: string;
}

export interface ChallengeParameters {
  USER_ID_FOR_SRP: string;
  SRP_B: string;
  SALT: string;
  SECRET_BLOCK: string;
}

export interface SRPCalculationParams {
  SRP_B: string;
  SALT: string;
  username: string;
  password: string;
  secretBlock: string;
  authenticationHelper: AuthenticationHelperType;
}

export interface SRPCalculationResult {
  signature: string;
  dateNow: string;
}

export interface SRPSetupResult {
  SRP_A: string;
  authenticationHelper: AuthenticationHelperType;
}

export interface AuthenticationHelperType {
  largeAValue: {
    toString(radix: number): string;
  };
  getPasswordAuthenticationKey(
    username: string,
    password: string,
    srpB: any,
    salt: any,
    callback: (err: unknown, result?: string) => void,
  ): void;
}

export type InputType = "text" | "hex";

export class AuthError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
