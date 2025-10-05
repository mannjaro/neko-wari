import type {
  InitiateAuthCommandOutput,
  RespondToAuthChallengeCommandOutput,
  StartWebAuthnRegistrationCommandOutput,
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

import type {
  AuthConfig,
  AuthResult,
  AuthTokens,
  ChallengeParameters,
} from "@/types/auth";
import { AuthError } from "@/types/auth";
import { calculatePasswordVerifier, calculateSRP_A } from "@/utils/auth";

export class CognitoAuthService {
  private client: CognitoIdentityProviderClient;
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
    this.client = new CognitoIdentityProviderClient({
      region: config.region,
    });
  }

  async startAuth(username: string, password: string): Promise<AuthResult> {
    try {
      // Step 1: SRP_A を計算
      const { SRP_A, authenticationHelper } = await calculateSRP_A(
        this.config.userPoolName,
      );

      // Step 2: InitiateAuth を呼び出し
      const initiateResponse = await this.initiateAuth(username, SRP_A);

      // Step 3: チャレンジパラメータを取得
      const challengeParams = this.extractChallengeParameters(initiateResponse);

      // Step 4: パスワード検証を計算
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

      // Step 5: チャレンジに応答
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

      // Step 6: 認証結果を返す
      return this.toAuthResult(challengeResponse);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError("Authentication failed", "SIGN_IN_ERROR", error);
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
  }): Promise<StartWebAuthnRegistrationCommandOutput> {
    const { accessToken } = params;

    try {
      const command = new StartWebAuthnRegistrationCommand({
        AccessToken: accessToken,
      });

      const response = await this.client.send(command);
      return response;
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

  private async initiateAuth(
    username: string,
    srpA: string,
  ): Promise<InitiateAuthCommandOutput> {
    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_SRP_AUTH,
      ClientId: this.config.clientId,
      AuthParameters: {
        USERNAME: username,
        SRP_A: srpA,
      },
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

  private extractChallengeParameters(
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
      USER_ID_FOR_SRP: challengeParams.USER_ID_FOR_SRP!,
      SRP_B: challengeParams.SRP_B!,
      SALT: challengeParams.SALT!,
      SECRET_BLOCK: challengeParams.SECRET_BLOCK!,
    };
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
    response: RespondToAuthChallengeCommandOutput,
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

  private extractTokens(
    response: RespondToAuthChallengeCommandOutput,
  ): AuthTokens {
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
}
