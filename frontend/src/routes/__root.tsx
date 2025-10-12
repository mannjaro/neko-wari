// src/routes/__root.tsx
/// <reference types="vite/client" />

import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { NotFound } from "@/components/NotFound";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "react-oidc-context";

import appCss from "@/styles/app.css?url";

const cognitoAuthConfig = {
  authority:
    "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_ntfS5MRXx",
  client_id: "52egt02nn47oubgatq6vadtgs4",
  redirect_uri: "http://localhost:3000",
  response_type: "code",
  scope: "aws.cognito.signin.user.admin email openid phone profile",
};

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
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
        title: "TanStack Start Starter",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

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
        <AuthProvider {...cognitoAuthConfig}>{children}</AuthProvider>
        <Scripts />
        <Toaster />
      </body>
    </html>
  );
}
