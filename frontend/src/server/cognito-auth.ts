import type {
  InitiateAuthCommandOutput,
  RespondToAuthChallengeCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  AuthFlowType,
  ChallengeNameType,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";

import type { AuthConfig, AuthTokens, ChallengeParameters } from "@/types/auth";
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

  async signIn(username: string, password: string): Promise<AuthTokens> {
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
      let challengeResponse = await this.respondToAuthChallenge(
        initiateResponse.ChallengeName!,
        {
          PASSWORD_CLAIM_SIGNATURE: signature,
          PASSWORD_CLAIM_SECRET_BLOCK: challengeParams.SECRET_BLOCK,
          TIMESTAMP: dateNow,
          USERNAME: challengeParams.USER_ID_FOR_SRP,
        },
        initiateResponse.Session,
      );

      // Step 6: 新しいパスワードが必要な場合の処理
      if (
        challengeResponse.ChallengeName ===
        ChallengeNameType.NEW_PASSWORD_REQUIRED
      ) {
        challengeResponse = await this.handleNewPasswordRequired(
          challengeResponse,
          challengeParams.USER_ID_FOR_SRP,
          password, // 現在のパスワードを新しいパスワードとして設定
        );
      }

      // Step 7: 認証結果を返す
      return this.extractTokens(challengeResponse);
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError("Authentication failed", "SIGN_IN_ERROR", error);
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
    challengeName: string,
    challengeResponses: Record<string, string>,
    session?: string,
  ): Promise<RespondToAuthChallengeCommandOutput> {
    const command = new RespondToAuthChallengeCommand({
      ClientId: this.config.clientId,
      ChallengeName: challengeName as ChallengeNameType,
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

  private async handleNewPasswordRequired(
    response: RespondToAuthChallengeCommandOutput,
    username: string,
    newPassword: string,
  ): Promise<RespondToAuthChallengeCommandOutput> {
    const command = new RespondToAuthChallengeCommand({
      Session: response.Session,
      ClientId: this.config.clientId,
      ChallengeName: response.ChallengeName!,
      ChallengeResponses: {
        NEW_PASSWORD: newPassword,
        USERNAME: username,
      },
    });

    try {
      return await this.client.send(command);
    } catch (error) {
      throw new AuthError(
        "Failed to set new password",
        "NEW_PASSWORD_ERROR",
        error,
      );
    }
  }

  private extractTokens(
    response: RespondToAuthChallengeCommandOutput,
  ): AuthTokens {
    const authResult = response.AuthenticationResult;

    if (!authResult) {
      throw new AuthError(
        "Authentication result is missing from response",
        "MISSING_AUTH_RESULT",
      );
    }

    return {
      accessToken: authResult.AccessToken || "",
      idToken: authResult.IdToken || "",
      refreshToken: authResult.RefreshToken || "",
    };
  }
}
