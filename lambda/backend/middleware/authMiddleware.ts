import { Context, Next } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger({ serviceName: "authMiddleware" });

// Cognito configuration
const COGNITO_REGION = "ap-northeast-1";
const COGNITO_USER_POOL_ID = "ap-northeast-1_ntfS5MRXx";
const COGNITO_ISSUER = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;
const JWKS_URI = `${COGNITO_ISSUER}/.well-known/jwks.json`;

// Create JWKS set for JWT verification
const JWKS = createRemoteJWKSet(new URL(JWKS_URI));

export interface AuthenticatedUser {
  sub: string; // Cognito user ID (UUID)
  email?: string;
  email_verified?: boolean;
  username?: string;
  "cognito:username"?: string;
}

/**
 * Middleware to verify JWT tokens from AWS Cognito and extract user information
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn("Missing or invalid Authorization header");
    return c.json({ error: "Unauthorized - Missing or invalid token" }, 401);
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    // Verify JWT token
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: COGNITO_ISSUER,
      audience: undefined, // Cognito doesn't set audience in access tokens
    });

    // Extract user information from the JWT payload
    const user: AuthenticatedUser = {
      sub: payload.sub as string,
      email: payload.email as string | undefined,
      email_verified: payload.email_verified as boolean | undefined,
      username: payload.username as string | undefined,
      "cognito:username": payload["cognito:username"] as string | undefined,
    };

    // Store user information in the context for use in handlers
    c.set("user", user);

    logger.info("User authenticated successfully", {
      sub: user.sub,
      email: user.email,
    });

    return next();
  } catch (error) {
    logger.error("JWT verification failed", { error });
    return c.json({ error: "Unauthorized - Invalid token" }, 401);
  }
}

/**
 * Helper function to get the authenticated user from context
 */
export function getAuthenticatedUser(c: Context): AuthenticatedUser | null {
  return c.get("user") || null;
}

/**
 * Helper function to get the canonical user ID (uses sub as the primary identifier)
 */
export function getCanonicalUserId(user: AuthenticatedUser): string {
  return user.sub;
}

/**
 * Helper function to get the user display name (uses email or username)
 */
export function getUserDisplayName(user: AuthenticatedUser): string {
  return user.email || user.username || user["cognito:username"] || user.sub;
}
