import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { type LoginFormData, LoginFormSchema } from "@/types/forms";
import { useAuth, authQueryKey } from "@/hooks/useAuth";
import type { AuthTokens } from "@/types/auth";
import { useQueryClient } from "@tanstack/react-query";
import { ChallengeNameType } from "@aws-sdk/client-cognito-identity-provider";
import {
  startPasskeyRegistration,
  completePasskeyRegistration,
} from "@/server/passkey";
import { startRegistration } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";

interface ChallengeFormValues {
  newPassword: string;
  confirmPassword: string;
  code: string;
}

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

export function LoginForm() {
  const startRegistPasskey = useServerFn(startPasskeyRegistration);
  const completeRegisterPasskey = useServerFn(completePasskeyRegistration);
  const queryClient = useQueryClient();
  const form = useForm<LoginFormData>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const challengeForm = useForm<ChallengeFormValues>({
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
      code: "",
    },
  });

  const { mutate, data, error, isSuccess, isPending, reset } = useAuth();
  const [username, setUsername] = useState("");
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeySuccess, setPasskeySuccess] = useState(false);

  const challenge = useMemo(() => {
    return data?.status === "CHALLENGE" ? data : null;
  }, [data]);

  const resolvedUsername = useMemo(() => {
    if (!challenge) {
      return username;
    }

    return username || challenge.parameters.USER_ID_FOR_SRP || "";
  }, [challenge, username]);

  const handleSubmit = form.handleSubmit((values) => {
    setUsername(values.email);
    mutate({
      mode: "START",
      email: values.email,
      password: values.password,
    });
  });

  const handleChallengeSubmit = challengeForm.handleSubmit((values) => {
    if (!challenge) {
      return;
    }

    if (!resolvedUsername) {
      const field =
        challenge.challengeName === ChallengeNameType.NEW_PASSWORD_REQUIRED
          ? "newPassword"
          : "code";
      challengeForm.setError(field as keyof ChallengeFormValues, {
        type: "validate",
        message: "ユーザー名が特定できません。最初からやり直してください。",
      });
      return;
    }

    const answers: Record<string, string> = {};

    switch (challenge.challengeName) {
      case ChallengeNameType.NEW_PASSWORD_REQUIRED: {
        if (values.newPassword !== values.confirmPassword) {
          challengeForm.setError("confirmPassword", {
            type: "validate",
            message: "新しいパスワードが一致しません",
          });
          return;
        }
        if (!values.newPassword) {
          challengeForm.setError("newPassword", {
            type: "validate",
            message: "新しいパスワードを入力してください",
          });
          return;
        }
        answers.NEW_PASSWORD = values.newPassword;
        break;
      }
      case ChallengeNameType.SMS_MFA: {
        if (!values.code) {
          challengeForm.setError("code", {
            type: "validate",
            message: "コードを入力してください",
          });
          return;
        }
        answers.SMS_MFA_CODE = values.code;
        break;
      }
      case ChallengeNameType.SOFTWARE_TOKEN_MFA: {
        if (!values.code) {
          challengeForm.setError("code", {
            type: "validate",
            message: "コードを入力してください",
          });
          return;
        }
        answers.SOFTWARE_TOKEN_MFA_CODE = values.code;
        break;
      }
      case ChallengeNameType.EMAIL_OTP: {
        if (!values.code) {
          challengeForm.setError("code", {
            type: "validate",
            message: "コードを入力してください",
          });
          return;
        }
        answers.EMAIL_OTP_CODE = values.code;
        break;
      }
      case ChallengeNameType.SMS_OTP: {
        if (!values.code) {
          challengeForm.setError("code", {
            type: "validate",
            message: "コードを入力してください",
          });
          return;
        }
        answers.OTP = values.code;
        break;
      }
      case ChallengeNameType.WEB_AUTHN: {
        // WebAuthn はブラウザ API 連携が必要。ここではプレースホルダー。
        if (!values.code) {
          challengeForm.setError("code", {
            type: "validate",
            message: "WebAuthn結果を入力してください",
          });
          return;
        }
        answers.WEB_AUTHN_ASSERTION = values.code;
        break;
      }
      default: {
        if (values.code) {
          answers.ANSWER = values.code;
        } else {
          challengeForm.setError("code", {
            type: "validate",
            message: "コードを入力してください",
          });
          return;
        }
        break;
      }
    }

    mutate({
      mode: "RESPOND",
      username: resolvedUsername,
      session: challenge.session,
      challengeName: challenge.challengeName,
      answers,
    });
    challengeForm.reset({
      newPassword: "",
      confirmPassword: "",
      code: "",
    });
  });

  const resetChallengeState = () => {
    challengeForm.reset({
      newPassword: "",
      confirmPassword: "",
      code: "",
    });
    reset();
    setUsername("");
  };

  const accessToken = useMemo(() => {
    if (data?.status === "SUCCESS") {
      return data.tokens.accessToken;
    }

    const cached = queryClient.getQueryData<AuthTokens | undefined>(
      authQueryKey,
    );

    return cached?.accessToken ?? "";
  }, [data, queryClient]);

  const handlePasskeyRegistration = async () => {
    setPasskeyError(null);
    setPasskeySuccess(false);

    if (!accessToken) {
      setPasskeyError("ログイン後に再度お試しください。");
      return;
    }

    try {
      setIsRegisteringPasskey(true);
      const options = await startRegistPasskey({
        data: { accessToken },
      });

      if (options === undefined) {
        throw new Error("Options is undefined");
      }

      // Parse options.CredentialCreationOptions to PublicKeyCredentialCreationOptionsJSON

      const registration = await startRegistration({
        optionsJSON: options,
      });

      await completeRegisterPasskey({
        data: {
          accessToken,
          credential: registration,
        },
      });

      setPasskeySuccess(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setPasskeyError("Passkey登録がユーザー操作でキャンセルされました。");
      } else if (err instanceof Error) {
        setPasskeyError(err.message || "Passkey登録に失敗しました。");
      } else {
        setPasskeyError("Passkey登録に失敗しました。");
      }
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Email"
                      required
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Password"
                      required
                      type="password"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isPending ? (
              <p className="text-sm text-muted-foreground">Logging you in…</p>
            ) : null}
            {isSuccess ? (
              <p className="text-sm text-emerald-600">Login successful.</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Signing in…" : "Login"}
            </Button>
            {accessToken ? (
              <div className="space-y-2 rounded-md border p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Passkey登録</p>
                  <p className="text-xs text-muted-foreground">
                    Passkeyを登録すると、次回以降ワンタップでサインインできます。
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handlePasskeyRegistration}
                  disabled={isRegisteringPasskey}
                >
                  {isRegisteringPasskey ? "登録中…" : "Passkeyを登録"}
                </Button>
                {passkeySuccess ? (
                  <p className="text-xs text-emerald-600">
                    Passkeyの登録が完了しました。
                  </p>
                ) : null}
                {passkeyError ? (
                  <p className="text-xs text-destructive">{passkeyError}</p>
                ) : null}
              </div>
            ) : null}
            <Button variant="outline" className="w-full" asChild>
              <Link to="/dashboard">ダッシュボードへ移動</Link>
            </Button>
          </form>
        </Form>

        {challenge ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              追加認証が必要です: {challenge.challengeName}
            </h3>
            <Form {...challengeForm}>
              <form onSubmit={handleChallengeSubmit} className="space-y-4">
                {challenge.challengeName ===
                ChallengeNameType.NEW_PASSWORD_REQUIRED ? (
                  <>
                    <FormField
                      control={challengeForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>新しいパスワード</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              required
                              disabled={isPending}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={challengeForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>新しいパスワード（確認）</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              required
                              disabled={isPending}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <FormField
                    control={challengeForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>確認コード</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="コードを入力"
                            required
                            disabled={isPending}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={isPending}>
                    送信
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPending}
                    onClick={resetChallengeState}
                  >
                    キャンセル
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive">
            {error.message || "認証に失敗しました"}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RouteComponent() {
  return (
    <div className="w-full md:w-2/3 lg:w-1/3 mx-auto space-y-6">
      <LoginForm />
    </div>
  );
}
