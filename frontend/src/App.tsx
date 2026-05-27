import { RouterProvider } from "@tanstack/react-router";
import { createRouter } from "./router";
import { AppAuthProvider, useAppAuth } from "./features/auth";

const router = createRouter();

function InnerApp() {
  const auth = useAppAuth();

  return (
    <RouterProvider
      router={router}
      context={{
        auth: {
          isAuthenticated: auth.isAuthenticated,
        },
      }}
    />
  );
}

export default function App() {
  return (
    <AppAuthProvider>
      <InnerApp />
    </AppAuthProvider>
  );
}
