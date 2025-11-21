// src/routes/__root.tsx
/// <reference types="vite/client" />

import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { NotFound } from "@/components/NotFound";
import { Toaster } from "@/components/ui/sonner";
import type { AuthState } from "@/utils/auth";
import { cognitoAuthConfig } from "@/utils/auth";
import { AuthProvider, useAuth } from "react-oidc-context";
import { useEffect } from "react";

import appCss from "@/styles/app.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  auth: AuthState;
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "立替にゃんこ",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/favicon.ico",
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      { rel: "manifest", href: "/site.webmanifest", color: "#fffff" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function AuthSync() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Update the router context with the latest auth state
    // This allows beforeLoad to access the correct auth state
    // We use a type assertion because context is technically read-only in types but mutable at runtime
    const context = router.options.context as { auth: AuthState };
    context.auth = {
      isAuthenticated: auth.isAuthenticated,
      user: auth.user,
      isLoading: auth.isLoading,
      signinRedirect: auth.signinRedirect,
    };

    // Invalidate the router to re-run beforeLoad checks if needed
    if (!auth.isLoading) {
      router.invalidate();
    }
  }, [auth, router]);

  return null;
}

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthProvider {...cognitoAuthConfig}>
          <AuthSync />
          {children}
        </AuthProvider>
        <Scripts />
        <Toaster />
      </body>
    </html>
  );
}
