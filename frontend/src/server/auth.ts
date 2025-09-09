import { createServerFn } from "@tanstack/react-start";
// @ts-ignore
import { default as AuthenticationHelperWrapper } from "amazon-cognito-identity-js/lib/AuthenticationHelper.js"; /** ビルドエラーを回避すべくあえて拡張子付き */
// @ts-ignore
import { default as BigIntegerWrapper } from "amazon-cognito-identity-js/lib/BigInteger.js";
const BigInteger = BigIntegerWrapper.default;
// @ts-ignore
import { default as DateHelperWrapper } from "amazon-cognito-identity-js/lib/DateHelper.js";
const DateHelper = DateHelperWrapper.default;
import {
  AuthFlowType,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  ChangePasswordCommand,
  RespondToAuthChallengeCommand,
  ChallengeNameType,
} from "@aws-sdk/client-cognito-identity-provider";

const AuthenticationHelper = AuthenticationHelperWrapper.default;

// Cognito User Pool の ID を引数に実行
// （AuthenticationHelperのコンストラクタが User Pool Name を要するため）
const calculateSRP_A = async (userPoolId: string) => {
  // User Pool Name は User Pool ID の　アンダースコア後の文字列
  // 例：
  //   User Pool ID   : ap-northeast-1_xxxxxxxxx
  //   User Pool Name : xxxxxxxxx
  const userPoolName = userPoolId.split("_")[1];
  const authenticationHelper = new AuthenticationHelper(userPoolName);
  const SRP_A = authenticationHelper.largeAValue.toString(16);

  // 後で使うので、AuthenticationHelperのインスタンスも返す
  return { SRP_A, authenticationHelper };
};

function hexToUint8Array(hex: string): Uint8Array {
  const pairs = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((byte) => parseInt(byte, 16)));
}

type InputType = "text" | "hex";

export async function hmacSHA256(
  message: string,
  key: string,
  inputType: InputType = "text"
): Promise<string> {
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
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  // 結果を Base64 エンコードして返す
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function getRespondValue({
  SRP_B,
  SALT,
  username,
  password,
  secretBlock,
  authenticationHelper,
}: {
  SRP_B: string;
  SALT: string;
  username: string;
  password: string;
  secretBlock: string;
  authenticationHelper: any;
}): Promise<{ signature: string; dateNow: string }> {
  // AuthenticationHelper を使ってパスワード認証キー (HKDF) を計算
  // この関数は内部で SRP の計算 (u = H(A, B), S = (B - k * g^x)^(a + u * x), K = H(S)) を行い、
  // 結果の K (共有鍵) を Base64 文字列として callback で返す
  const hkdfResult = { hkdf: undefined as undefined | string };
  authenticationHelper.getPasswordAuthenticationKey(
    username,
    password,
    new BigInteger(SRP_B, 16),
    new BigInteger(SALT, 16),
    (_err: unknown, result?: string) => {
      hkdfResult.hkdf = result;
    }
  );
  const dateHelper = new DateHelper();
  const dateNow = dateHelper.getNowString();

  // 署名対象のメッセージを作成
  // (UserPoolName + USERNAME + SECRET_BLOCK + TIMESTAMP)
  const msg = Buffer.concat([
    Buffer.from("k3Oz2eZ3E", "utf-8"), // UserPoolName (IDの_以降の部分)
    Buffer.from(username, "utf-8"),
    Buffer.from(secretBlock, "base64"),
    Buffer.from(dateNow, "utf-8"),
  ]);

  const msgHex = msg.toString("hex");
  const hkdfHex = Buffer.from(hkdfResult.hkdf as string, "base64").toString(
    "hex"
  );

  // HMAC-SHA256 を計算 (キーは HKDF)
  const signature = await hmacSHA256(msgHex, hkdfHex, "hex");

  return { signature, dateNow };
}

export const startAuth = createServerFn().handler(async () => {
  // Wait for 1 second

  const username = "test-user";
  const password = "Jaws4423-";
  const response = await signIn(username, password);
  console.log(response);
});

export const signIn = async (
  username: string,
  password: string
): Promise<any> => {
  const { SRP_A, authenticationHelper } = await calculateSRP_A(
    "ap-northeast-1_k3Oz2eZ3E"
  );
  const cognitoClient = new CognitoIdentityProviderClient({
    region: "ap-northeast-1",
  });
  const command = new InitiateAuthCommand({
    AuthFlow: AuthFlowType.USER_SRP_AUTH,
    ClientId: "3rsdcgnbj0cfetdhgpd5s889lf",
    AuthParameters: {
      USERNAME: username,
      SRP_A: SRP_A,
    },
  });
  // 4. Cognito API 呼び出しとレスポンス取得
  const response = await cognitoClient.send(command); // InitiateAuth のレスポンス

  console.log(response);
  // 1. チャレンジパラメータの取得
  const challengeParams = response.ChallengeParameters;
  if (!challengeParams) {
    throw new Error("Challenge parameters are missing");
  }
  const userIdForSrp = challengeParams.USER_ID_FOR_SRP || "";
  const srpB = challengeParams.SRP_B || "";
  const salt = challengeParams.SALT || "";
  const secretBlock = challengeParams.SECRET_BLOCK || "";

  // 2. 署名とタイムスタンプの計算
  const { signature, dateNow } = await getRespondValue({
    SRP_B: srpB,
    SALT: salt,
    username: userIdForSrp, // InitiateAuthレスポンスの USER_ID_FOR_SRP を使う
    password: password,
    secretBlock: secretBlock,
    authenticationHelper,
  });

  // 3. SECRET_HASH の再計算 (USER_ID_FOR_SRP を使用)

  // 4. RespondToAuthChallengeCommand の準備
  const respondCommand = new RespondToAuthChallengeCommand({
    ClientId: "3rsdcgnbj0cfetdhgpd5s889lf",
    ChallengeName: response.ChallengeName, // 'PASSWORD_VERIFIER'
    ChallengeResponses: {
      PASSWORD_CLAIM_SIGNATURE: signature,
      PASSWORD_CLAIM_SECRET_BLOCK: secretBlock,
      TIMESTAMP: dateNow,
      USERNAME: userIdForSrp, // InitiateAuthレスポンスの USER_ID_FOR_SRP を使う
    },
  });

  // 5. Cognito API 呼び出しと最終結果取得
  let respondResponse = await cognitoClient.send(respondCommand);
  console.log(respondResponse);

  if (
    respondResponse.ChallengeName === ChallengeNameType.NEW_PASSWORD_REQUIRED
  ) {
    const respondCommand = new RespondToAuthChallengeCommand({
      Session: respondResponse.Session,
      ClientId: "3rsdcgnbj0cfetdhgpd5s889lf",
      ChallengeName: respondResponse.ChallengeName,
      ChallengeResponses: {
        NEW_PASSWORD: "Jaws4423-",
        USERNAME: userIdForSrp,
      },
    });
    respondResponse = await cognitoClient.send(respondCommand);
    console.log(respondResponse);
  }

  if (!respondResponse.AuthenticationResult) {
    throw new Error("Authentication failed");
  }

  // 認証成功！トークンを返す
  return {
    accessToken: respondResponse.AuthenticationResult.AccessToken || "",
    idToken: respondResponse.AuthenticationResult.IdToken || "",
    refreshToken: respondResponse.AuthenticationResult.RefreshToken || "",
  };
};
