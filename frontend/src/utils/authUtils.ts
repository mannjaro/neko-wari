// src/utils/authUtils.ts
import type { User } from "oidc-client-ts";

/**
 * Check if the access token is expired or about to expire
 * @param user - The OIDC user object
 * @param bufferSeconds - Number of seconds before expiration to consider the token as expired (default: 60)
 * @returns true if the token is expired or about to expire
 */
export function isTokenExpired(
  user: User | null | undefined,
  bufferSeconds = 60,
): boolean {
  if (!user || !user.expires_at) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const expiresAt = user.expires_at;

  // Token is expired if current time + buffer is greater than or equal to expiration time
  return currentTime + bufferSeconds >= expiresAt;
}

/**
 * Check if the refresh token is available
 * @param user - The OIDC user object
 * @returns true if a refresh token is available
 */
export function hasRefreshToken(user: User | null | undefined): boolean {
  return !!user?.refresh_token;
}
