import { Logger } from "@aws-lambda-powertools/logger";
import { LINE_LOGIN_CONFIG } from "../../../shared/constants";
import type { LineTokenResponse, LineUserProfile } from "../../../shared/types";

const logger = new Logger({ serviceName: "lineLoginService" });

/**
 * Service for LINE Login OAuth 2.0 integration
 */
export class LineLoginService {
  /**
   * Generate LINE Login authorization URL
   */
  generateAuthUrl(state: string, nonce: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: LINE_LOGIN_CONFIG.CHANNEL_ID,
      redirect_uri: LINE_LOGIN_CONFIG.REDIRECT_URI,
      state,
      scope: LINE_LOGIN_CONFIG.SCOPES.join(" "),
      nonce,
    });

    return `${LINE_LOGIN_CONFIG.AUTHORIZATION_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<LineTokenResponse> {
    try {
      const params = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: LINE_LOGIN_CONFIG.REDIRECT_URI,
        client_id: LINE_LOGIN_CONFIG.CHANNEL_ID,
        client_secret: LINE_LOGIN_CONFIG.CHANNEL_SECRET,
      });

      const response = await fetch(LINE_LOGIN_CONFIG.TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Failed to exchange code for token", {
          status: response.status,
          error: errorText,
        });
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const data = await response.json();
      return data as LineTokenResponse;
    } catch (error) {
      logger.error("Error exchanging code for token", { error, code });
      throw error;
    }
  }

  /**
   * Get LINE user profile using access token
   */
  async getUserProfile(accessToken: string): Promise<LineUserProfile> {
    try {
      const response = await fetch(LINE_LOGIN_CONFIG.PROFILE_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Failed to get user profile", {
          status: response.status,
          error: errorText,
        });
        throw new Error(`Get profile failed: ${response.status}`);
      }

      const data = await response.json();
      return data as LineUserProfile;
    } catch (error) {
      logger.error("Error getting user profile", { error });
      throw error;
    }
  }

  /**
   * Verify ID token (optional, for additional security)
   */
  async verifyIdToken(
    idToken: string,
  ): Promise<{ sub: string; name: string; picture?: string }> {
    try {
      const params = new URLSearchParams({
        id_token: idToken,
        client_id: LINE_LOGIN_CONFIG.CHANNEL_ID,
      });

      const response = await fetch(
        `${LINE_LOGIN_CONFIG.VERIFY_TOKEN_URL}?${params.toString()}`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Failed to verify ID token", {
          status: response.status,
          error: errorText,
        });
        throw new Error(`ID token verification failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error("Error verifying ID token", { error });
      throw error;
    }
  }
}

// Export singleton instance
export const lineLoginService = new LineLoginService();
