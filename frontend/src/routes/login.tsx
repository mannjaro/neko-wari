import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { useMemo, useState, useEffect } from "react";
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
import { useAuthChallenge } from "@/hooks/useAuthChallenge";
import type { AuthTokens } from "@/types/auth";
import { useQueryClient } from "@tanstack/react-query";
import { ChallengeNameType } from "@aws-sdk/client-cognito-identity-provider";
import {
  startPasskeyRegistration,
  completePasskeyRegistration,
} from "@/server/passkey";
import { startRegistration } from "@simplewebauthn/browser";

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
  const {
    authenticateWithPassword,
    authenticateWithPasskey,
    respondToChallenge,
    respondToChallengeAsync,
    data,
    challenge,
    error,
    isSuccess,
    isPending,
    method,
    reset,
  } = useAuth();
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeySuccess, setPasskeySuccess] = useState(false);
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);

  const challengeHandlers = useAuthChallenge({
    challenge,
    submitChallenge: respondToChallenge,
    submitChallengeAsync: respondToChallengeAsync,
    isPending,
  });

  const emailValue = form.watch("email");

  // Auto-trigger passkey authentication when email is entered
  useEffect(() => {
    // Only auto-trigger once per session, when:
    // - Email has been entered
    // - Not already processing
    // - Not already authenticated
    // - Haven't auto-triggered before
    if (
      emailValue &&
      !isPending &&
      !isSuccess &&
      !hasAutoTriggered &&
      !challenge
    ) {
      setHasAutoTriggered(true);
      // Small delay to ensure smooth UX
      const timer = setTimeout(() => {
        authenticateWithPasskey({ username: emailValue });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [
    emailValue,
    isPending,
    isSuccess,
    hasAutoTriggered,
    challenge,
    authenticateWithPasskey,
  ]);

  const handleSubmit = form.handleSubmit((values) => {
    authenticateWithPassword({
      email: values.email,
      password: values.password,
    });
  });

  const resetChallengeState = () => {
    challengeHandlers.resetForm();
    reset();
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
                      autoComplete="username webauthn"
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
              {isPending && method === "PASSWORD" ? "Signing in…" : "Login"}
            </Button>
            <Button
              type="button"
              className="w-full"
              variant="secondary"
              disabled={isPending || !emailValue}
              onClick={() => {
                if (emailValue) {
                  authenticateWithPasskey({ username: emailValue });
                }
              }}
            >
              {isPending && method === "PASSKEY"
                ? "Passkeyでサインイン中…"
                : "Passkeyでログイン"}
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
              <Link to="/">ダッシュボードへ移動</Link>
            </Button>
          </form>
        </Form>

        {challengeHandlers.challenge ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              追加認証が必要です: {challengeHandlers.challenge.challengeName}
            </h3>
            {challengeHandlers.shouldRenderForm ? (
              <Form {...challengeHandlers.form}>
                <form
                  onSubmit={challengeHandlers.handleSubmit}
                  className="space-y-4"
                >
                  {challengeHandlers.challenge?.challengeName ===
                  ChallengeNameType.NEW_PASSWORD_REQUIRED ? (
                    <>
                      <FormField
                        control={challengeHandlers.form.control}
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
                        control={challengeHandlers.form.control}
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
                      control={challengeHandlers.form.control}
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
            ) : null}
            {challengeHandlers.passkey ? (
              <div className="space-y-2 rounded-md border p-3 text-sm">
                <p>Passkeyでの認証を進めています。</p>
                {/* {challengeHandlers.passkey.error ? (
                  <p className="text-xs text-destructive">
                    {challengeHandlers.passkey.error}
                  </p>
                ) : null} */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={
                      isPending ||
                      challengeHandlers.passkey.isProcessing ||
                      !challengeHandlers.passkey.hasOptions
                    }
                    onClick={() => challengeHandlers.passkey?.retry()}
                  >
                    {challengeHandlers.passkey.isProcessing
                      ? "認証処理中…"
                      : "再試行"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={resetChallengeState}
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            ) : null}
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
