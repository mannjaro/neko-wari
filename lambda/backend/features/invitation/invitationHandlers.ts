import { Logger } from "@aws-lambda-powertools/logger";
import type { Context } from "hono";
import { invitationService } from "./invitationService";
import { lineLoginService } from "../auth/lineLoginService";
import type { CreateInvitation, InvitationStatus } from "../../../shared/types";
import { randomBytes } from "node:crypto";

const logger = new Logger({ serviceName: "invitationHandlers" });

/**
 * Handler for creating a new invitation
 */
export async function createInvitationHandler(
  c: Context,
  body: CreateInvitation,
) {
  try {
    const { createdBy, expirationHours, metadata } = body;

    const invitation = await invitationService.createInvitation(
      createdBy,
      expirationHours,
      metadata,
    );

    return c.json(invitation, 201);
  } catch (error) {
    logger.error("Error in createInvitationHandler", { error, body });
    return c.json({ error: "Failed to create invitation" }, 500);
  }
}

/**
 * Handler for getting invitation details and redirecting to LINE Login
 */
export async function getInvitationHandler(c: Context) {
  try {
    const token = c.req.param("token");

    if (!token) {
      return c.json({ error: "Token is required" }, 400);
    }

    const validation = await invitationService.validateInvitation(token);

    if (!validation.valid) {
      return c.html(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Invitation</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">Invalid Invitation</h1>
            <p>${validation.reason || "This invitation is no longer valid."}</p>
          </body>
        </html>
      `);
    }

    // Generate state parameter with invitation token
    const state = JSON.stringify({
      token,
      nonce: randomBytes(16).toString("hex"),
    });
    const nonce = randomBytes(16).toString("hex");

    // Redirect to LINE Login
    const authUrl = lineLoginService.generateAuthUrl(
      Buffer.from(state).toString("base64"),
      nonce,
    );

    return c.redirect(authUrl);
  } catch (error) {
    logger.error("Error in getInvitationHandler", { error });
    return c.json({ error: "Failed to process invitation" }, 500);
  }
}

/**
 * Handler for LINE OAuth callback
 */
export async function lineLoginCallbackHandler(c: Context) {
  try {
    const code = c.req.query("code");
    const stateParam = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      logger.error("LINE Login error", { error });
      return c.html(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Login Failed</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">Login Failed</h1>
            <p>Failed to authenticate with LINE. Please try again.</p>
          </body>
        </html>
      `);
    }

    if (!code || !stateParam) {
      logger.error("Missing required parameters", { code, stateParam });
      return c.json({ error: "Missing required parameters" }, 400);
    }

    logger.info("Callback received", {
      code: code.substring(0, 10) + "...",
      stateParam: stateParam.substring(0, 50) + "...",
    });

    // Decode state parameter
    let state: { token: string; nonce: string };
    try {
      const stateJson = Buffer.from(stateParam, "base64").toString("utf-8");
      logger.info("State decoded", { stateJson });
      state = JSON.parse(stateJson);
      logger.info("State parsed", { token: state.token });
    } catch (error) {
      logger.error("Failed to decode state parameter", { error, stateParam });
      return c.html(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Error</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">Error</h1>
            <p>Invalid state parameter. Please try again.</p>
          </body>
        </html>
      `);
    }

    const { token } = state;

    // Exchange code for token
    logger.info("Exchanging code for LINE access token");
    const tokenResponse = await lineLoginService.exchangeCodeForToken(code);
    logger.info("LINE access token obtained");

    // Get user profile
    logger.info("Getting LINE user profile");
    const userProfile = await lineLoginService.getUserProfile(
      tokenResponse.access_token,
    );
    logger.info("LINE user profile obtained", { userId: userProfile.userId });

    // Accept invitation with LINE user info
    logger.info("Accepting invitation", {
      token,
      lineUserId: userProfile.userId,
    });

    try {
      const acceptedInvitation =
        await invitationService.acceptInvitationWithLineId(
          token,
          userProfile.userId,
          userProfile.displayName,
          userProfile.pictureUrl,
        );

      logger.info("Invitation accepted via LINE Login", {
        invitationId: acceptedInvitation.InvitationId,
        lineUserId: userProfile.userId,
      });

      // Return success page
      return c.html(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Welcome!</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: sans-serif; 
                text-align: center; 
                padding: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .success { 
                background: white;
                color: #333;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                max-width: 500px;
                margin: 0 auto;
              }
              h1 { color: #667eea; }
              .profile {
                margin: 20px 0;
              }
              .profile img {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                margin-bottom: 10px;
              }
            </style>
          </head>
          <body>
            <div class="success">
              <h1>✓ Welcome!</h1>
              <div class="profile">
                ${userProfile.pictureUrl ? `<img src="${userProfile.pictureUrl}" alt="Profile">` : ""}
                <p><strong>${userProfile.displayName}</strong></p>
              </div>
              <p>Your invitation has been accepted successfully.</p>
              <p>You can now close this window and start using the service.</p>
            </div>
          </body>
        </html>
      `);
    } catch (invitationError) {
      // Check if user is already registered
      if (
        invitationError instanceof Error &&
        invitationError.message === "USER_ALREADY_REGISTERED"
      ) {
        logger.info("User already registered, showing info page", {
          lineUserId: userProfile.userId,
        });

        return c.html(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Already Registered</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { 
                  font-family: sans-serif; 
                  text-align: center; 
                  padding: 50px;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                }
                .info { 
                  background: white;
                  color: #333;
                  padding: 40px;
                  border-radius: 10px;
                  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                  max-width: 500px;
                  margin: 0 auto;
                }
                h1 { color: #f59e0b; }
                .profile {
                  margin: 20px 0;
                }
                .profile img {
                  width: 80px;
                  height: 80px;
                  border-radius: 50%;
                  margin-bottom: 10px;
                }
                .message {
                  margin: 20px 0;
                  line-height: 1.6;
                }
                .footer {
                  margin-top: 30px;
                  color: #666;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="info">
                <h1>⚠️ 既に登録済みです</h1>
                <div class="profile">
                  ${userProfile.pictureUrl ? `<img src="${userProfile.pictureUrl}" alt="Profile">` : ""}
                  <p><strong>${userProfile.displayName}</strong></p>
                </div>
                <div class="message">
                  <p>このアカウントは既にシステムに登録されています。</p>
                  <p>新しい招待URLを使用する必要はありません。</p>
                </div>
                <div class="footer">
                  <p>このウィンドウを閉じてください。</p>
                </div>
              </div>
            </body>
          </html>
        `);
      }

      // Re-throw other errors to be caught by outer catch
      throw invitationError;
    }
  } catch (error) {
    logger.error("Error in lineLoginCallbackHandler", { error });
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: sans-serif; text-align: center; padding: 50px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h1 class="error">Error</h1>
          <p>An error occurred while processing your invitation. Please try again.</p>
        </body>
      </html>
    `);
  }
}

/**
 * Handler for listing invitations
 */
export async function listInvitationsHandler(c: Context) {
  try {
    const createdBy = c.req.query("createdBy");
    const status = c.req.query("status") as InvitationStatus | undefined;

    const invitations = await invitationService.listInvitations(
      createdBy,
      status,
    );

    return c.json({ invitations });
  } catch (error) {
    logger.error("Error in listInvitationsHandler", { error });
    return c.json({ error: "Failed to list invitations" }, 500);
  }
}

/**
 * Handler for revoking an invitation
 */
export async function revokeInvitationHandler(c: Context) {
  try {
    const invitationId = c.req.param("invitationId");

    if (!invitationId) {
      return c.json({ error: "Invitation ID is required" }, 400);
    }

    await invitationService.revokeInvitation(invitationId);

    return c.json({ message: "Invitation revoked successfully" });
  } catch (error) {
    logger.error("Error in revokeInvitationHandler", { error });
    return c.json({ error: "Failed to revoke invitation" }, 500);
  }
}
