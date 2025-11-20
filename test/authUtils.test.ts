// test/authUtils.test.ts
// import { describe, it, expect } from "vitest";
import { isTokenExpired, hasRefreshToken } from "../frontend/src/utils/authUtils";
import type { User } from "oidc-client-ts";

describe("authUtils", () => {
  describe("isTokenExpired", () => {
    it("should return true if user is null", () => {
      expect(isTokenExpired(null)).toBe(true);
    });

    it("should return true if user is undefined", () => {
      expect(isTokenExpired(undefined)).toBe(true);
    });

    it("should return true if expires_at is not set", () => {
      const user = {} as User;
      expect(isTokenExpired(user)).toBe(true);
    });

    it("should return true if token has expired", () => {
      const user = {
        expires_at: Math.floor(Date.now() / 1000) - 100, // expired 100 seconds ago
      } as User;
      expect(isTokenExpired(user)).toBe(true);
    });

    it("should return true if token is about to expire within buffer time", () => {
      const user = {
        expires_at: Math.floor(Date.now() / 1000) + 30, // expires in 30 seconds
      } as User;
      expect(isTokenExpired(user, 60)).toBe(true); // buffer is 60 seconds
    });

    it("should return false if token is not expired and not within buffer time", () => {
      const user = {
        expires_at: Math.floor(Date.now() / 1000) + 120, // expires in 120 seconds
      } as User;
      expect(isTokenExpired(user, 60)).toBe(false); // buffer is 60 seconds
    });

    it("should use custom buffer time", () => {
      const user = {
        expires_at: Math.floor(Date.now() / 1000) + 150, // expires in 150 seconds
      } as User;
      expect(isTokenExpired(user, 200)).toBe(true); // buffer is 200 seconds
      expect(isTokenExpired(user, 100)).toBe(false); // buffer is 100 seconds
    });
  });

  describe("hasRefreshToken", () => {
    it("should return false if user is null", () => {
      expect(hasRefreshToken(null)).toBe(false);
    });

    it("should return false if user is undefined", () => {
      expect(hasRefreshToken(undefined)).toBe(false);
    });

    it("should return false if refresh_token is not set", () => {
      const user = {} as User;
      expect(hasRefreshToken(user)).toBe(false);
    });

    it("should return false if refresh_token is empty string", () => {
      const user = { refresh_token: "" } as User;
      expect(hasRefreshToken(user)).toBe(false);
    });

    it("should return true if refresh_token is set", () => {
      const user = { refresh_token: "valid_refresh_token" } as User;
      expect(hasRefreshToken(user)).toBe(true);
    });
  });
});
