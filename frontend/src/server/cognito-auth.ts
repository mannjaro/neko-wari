import type {
  InitiateAuthCommandOutput,
  RespondToAuthChallengeCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  AuthFlowType,
  ChallengeNameType,
  CognitoIdentityProviderClient,
  CompleteWebAuthnRegistrationCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  StartWebAuthnRegistrationCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialDescriptorJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";

import type {
  AuthConfig,
  AuthResult,
  AuthTokens,
  ChallengeParameters,
} from "@/types/auth";
import { AuthError } from "@/types/auth";
import { calculatePasswordVerifier, calculateSRP_A } from "@/utils/auth";

type CognitoAuthResponse =
  | InitiateAuthCommandOutput
  | RespondToAuthChallengeCommandOutput;

export class CognitoAuthService {
  private readonly client: CognitoIdentityProviderClient;
  private readonly config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
    this.client = new CognitoIdentityProviderClient({
      region: config.region,
    });
  }

  async authenticateWithPassword(
    username: string,
    password: string,
  ): Promise<AuthResult> {
    try {
      const { SRP_A, authenticationHelper } = await calculateSRP_A(
        this.config.userPoolName,
      );

      const initiateResponse = await this.initiateAuth(
        AuthFlowType.USER_SRP_AUTH,
        {
          USERNAME: username,
          SRP_A,
        },
      );

      const challengeParams =
        this.extractSrpChallengeParameters(initiateResponse);

      const { signature, dateNow } = await calculatePasswordVerifier(
        {
          SRP_B: challengeParams.SRP_B,
          SALT: challengeParams.SALT,
          username: challengeParams.USER_ID_FOR_SRP,
          password,
          secretBlock: challengeParams.SECRET_BLOCK,
          authenticationHelper,
        },
        this.config.userPoolName,
      );

      const challengeResponse = await this.respondToAuthChallenge(
        (initiateResponse.ChallengeName as ChallengeNameType) ||
          ChallengeNameType.PASSWORD_VERIFIER,
        {
          PASSWORD_CLAIM_SIGNATURE: signature,
          PASSWORD_CLAIM_SECRET_BLOCK: challengeParams.SECRET_BLOCK,
          TIMESTAMP: dateNow,
          USERNAME: challengeParams.USER_ID_FOR_SRP,
        },
        initiateResponse.Session,
      );

      return this.toAuthResult(challengeResponse);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      throw new AuthError(
        "Failed to authenticate with password",
        "SIGN_IN_ERROR",
        error,
      );
    }
  }

  async startUserAuth(username: string): Promise<AuthResult> {
    try {
      const response = await this.initiateAuth(AuthFlowType.USER_AUTH, {
        USERNAME: username,
      });

      return this.toAuthResult(response);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      throw new AuthError(
        "Failed to start user authentication",
        "START_USER_AUTH_ERROR",
        error,
      );
    }
  }

  async respondToChallenge(args: {
    username: string;
    session: string;
    challengeName: ChallengeNameType;
    answers: Record<string, string>;
  }): Promise<AuthResult> {
    try {
      const challengeResponses = this.buildChallengeResponses(
        args.challengeName,
        args.answers,
        args.username,
      );

      const response = await this.respondToAuthChallenge(
        args.challengeName,
        challengeResponses,
        args.session,
      );

      return this.toAuthResult(response, args.session);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      throw new AuthError(
        "Failed to respond to authentication challenge",
        "RESPOND_CHALLENGE_ERROR",
        error,
      );
    }
  }

  async startPasskeyRegistration(params: {
    accessToken: string;
  }): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const { accessToken } = params;

    try {
      const command = new StartWebAuthnRegistrationCommand({
        AccessToken: accessToken,
      });

      const response = await this.client.send(command);
      if (!response.CredentialCreationOptions) {
        throw new AuthError(
          "Credential creation options were not returned",
          "MISSING_PASSKEY_OPTIONS",
          response,
        );
      }

      return this.normalizeCredentialCreationOptions(
        response.CredentialCreationOptions,
      );
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      throw new AuthError(
        "Failed to start passkey registration",
        "START_PASSKEY_REGISTRATION_ERROR",
        error,
      );
    }
  }

  async completePasskeyRegistration(params: {
    accessToken: string;
    credential: RegistrationResponseJSON;
  }): Promise<void> {
    const { accessToken, credential } = params;

    try {
      const command = new CompleteWebAuthnRegistrationCommand({
        AccessToken: accessToken,
        Credential: credential,
      });

      await this.client.send(command);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      throw new AuthError(
        "Failed to complete passkey registration",
        "COMPLETE_PASSKEY_REGISTRATION_ERROR",
        error,
      );
    }
  }

  private async initiateAuth(
    authFlow: AuthFlowType,
    authParameters: Record<string, string>,
  ): Promise<InitiateAuthCommandOutput> {
    const command = new InitiateAuthCommand({
      AuthFlow: authFlow,
      ClientId: this.config.clientId,
      AuthParameters: authParameters,
    });

    try {
      return await this.client.send(command);
    } catch (error) {
      throw new AuthError(
        "Failed to initiate authentication",
        "INITIATE_AUTH_ERROR",
        error,
      );
    }
  }

  private async respondToAuthChallenge(
    challengeName: ChallengeNameType,
    challengeResponses: Record<string, string>,
    session?: string,
  ): Promise<RespondToAuthChallengeCommandOutput> {
    const command = new RespondToAuthChallengeCommand({
      ClientId: this.config.clientId,
      ChallengeName: challengeName,
      ChallengeResponses: challengeResponses,
      Session: session,
    });

    try {
      return await this.client.send(command);
    } catch (error) {
      throw new AuthError(
        "Failed to respond to authentication challenge",
        "CHALLENGE_RESPONSE_ERROR",
        error,
      );
    }
  }

  private toAuthResult(
    response: CognitoAuthResponse,
    fallbackSession?: string,
  ): AuthResult {
    if (response.AuthenticationResult) {
      return {
        status: "SUCCESS",
        tokens: this.extractTokens(response),
      };
    }

    const challengeName = response.ChallengeName as
      | ChallengeNameType
      | undefined;

    if (challengeName) {
      const session = response.Session ?? fallbackSession;

      if (!session) {
        throw new AuthError(
          "Challenge response is missing session token",
          "MISSING_CHALLENGE_SESSION",
          response,
        );
      }

      return {
        status: "CHALLENGE",
        challengeName,
        session,
        parameters: response.ChallengeParameters ?? {},
      };
    }

    throw new AuthError(
      "Cognito response did not include tokens or challenge",
      "INVALID_AUTH_RESPONSE",
      response,
    );
  }

  private extractTokens(response: CognitoAuthResponse): AuthTokens {
    const authResult = response.AuthenticationResult;

    if (!authResult) {
      throw new AuthError(
        "Authentication result is missing from response",
        "MISSING_AUTH_RESULT",
        response,
      );
    }

    return {
      accessToken: authResult.AccessToken || "",
      idToken: authResult.IdToken || "",
      refreshToken: authResult.RefreshToken || "",
    };
  }

  private extractSrpChallengeParameters(
    response: InitiateAuthCommandOutput,
  ): ChallengeParameters {
    const challengeParams = response.ChallengeParameters;

    if (!challengeParams) {
      throw new AuthError(
        "Challenge parameters are missing from response",
        "MISSING_CHALLENGE_PARAMS",
      );
    }

    const requiredParams = ["USER_ID_FOR_SRP", "SRP_B", "SALT", "SECRET_BLOCK"];
    const missingParams = requiredParams.filter(
      (param) => !challengeParams[param],
    );

    if (missingParams.length > 0) {
      throw new AuthError(
        `Missing required challenge parameters: ${missingParams.join(", ")}`,
        "INVALID_CHALLENGE_PARAMS",
      );
    }

    return {
      USER_ID_FOR_SRP: challengeParams.USER_ID_FOR_SRP || "",
      SRP_B: challengeParams.SRP_B || "",
      SALT: challengeParams.SALT || "",
      SECRET_BLOCK: challengeParams.SECRET_BLOCK || "",
    };
  }

  private buildChallengeResponses(
    challengeName: ChallengeNameType,
    answers: Record<string, string>,
    username: string,
  ): Record<string, string> {
    const responses: Record<string, string> = {
      ...answers,
    };

    if (challengeName === ChallengeNameType.NEW_PASSWORD_REQUIRED) {
      const newPassword =
        responses.NEW_PASSWORD ?? (responses.newPassword as string | undefined);

      if (!newPassword) {
        throw new AuthError(
          "New password is required for NEW_PASSWORD_REQUIRED challenge",
          "MISSING_NEW_PASSWORD",
        );
      }

      responses.NEW_PASSWORD = newPassword;
      delete responses.newPassword;
    }

    responses.USERNAME = responses.USERNAME ?? username;

    return responses;
  }

  private normalizeCredentialCreationOptions(
    options: unknown,
  ): PublicKeyCredentialCreationOptionsJSON {
    const parsedOptions = this.parseCredentialCreationOptions(options);
    const publicKeyOptions =
      (parsedOptions as { publicKey?: PublicKeyCredentialCreationOptionsJSON })
        .publicKey ?? (parsedOptions as PublicKeyCredentialCreationOptionsJSON);

    if (!publicKeyOptions?.challenge) {
      throw new AuthError(
        "Passkey credential options are missing challenge",
        "INVALID_PASSKEY_OPTIONS",
        options,
      );
    }

    const normalizedUser = {
      ...publicKeyOptions.user,
      id: this.ensureBase64URL(publicKeyOptions.user.id),
    };

    const normalizedExcludeCredentials =
      publicKeyOptions.excludeCredentials?.map((credential) => ({
        ...credential,
        id: this.ensureBase64URL(credential.id),
      })) as PublicKeyCredentialDescriptorJSON[] | undefined;

    return {
      ...publicKeyOptions,
      challenge: this.ensureBase64URL(publicKeyOptions.challenge),
      excludeCredentials: normalizedExcludeCredentials,
      user: normalizedUser,
    };
  }

  private parseCredentialCreationOptions(options: unknown): unknown {
    if (options == null) {
      throw new AuthError(
        "Passkey credential options were empty",
        "INVALID_PASSKEY_OPTIONS",
        options,
      );
    }

    if (typeof options === "string") {
      return this.tryParseDocumentString(options);
    }

    if (ArrayBuffer.isView(options)) {
      const view = options as ArrayBufferView;
      const array = new Uint8Array(
        view.buffer,
        view.byteOffset,
        view.byteLength,
      );
      const text = new TextDecoder().decode(array);
      return this.tryParseDocumentString(text);
    }

    if (options instanceof ArrayBuffer) {
      const text = new TextDecoder().decode(new Uint8Array(options));
      return this.tryParseDocumentString(text);
    }

    return options;
  }

  private tryParseDocumentString(value: string): unknown {
    const trimmed = value.trim();

    if (!trimmed) {
      throw new AuthError(
        "Passkey credential document string is empty",
        "INVALID_PASSKEY_OPTIONS",
        value,
      );
    }

    try {
      return JSON.parse(trimmed);
    } catch (jsonError) {
      try {
        const base64 = this.convertToBase64(trimmed);
        const decoded = isoBase64URL.toBuffer(base64, "base64");
        const text = new TextDecoder().decode(decoded);
        return JSON.parse(text);
      } catch (parseError) {
        throw new AuthError(
          "Failed to parse passkey credential options",
          "INVALID_PASSKEY_OPTIONS",
          { value, jsonError, parseError },
        );
      }
    }
  }

  private ensureBase64URL(value: string): string {
    if (isoBase64URL.isBase64URL(value)) {
      return isoBase64URL.trimPadding(value);
    }

    if (isoBase64URL.isBase64(value)) {
      const buffer = isoBase64URL.toBuffer(value, "base64");
      return isoBase64URL.fromBuffer(buffer);
    }

    return value;
  }

  private convertToBase64(value: string): string {
    if (isoBase64URL.isBase64(value)) {
      return value;
    }

    if (isoBase64URL.isBase64URL(value)) {
      return isoBase64URL.toBase64(value);
    }

    throw new AuthError(
      "Provided value is not base64/base64url encoded",
      "INVALID_PASSKEY_OPTIONS",
      value,
    );
  }
}
