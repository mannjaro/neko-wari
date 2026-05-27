interface ImportMetaEnv {
  readonly VITE_COGNITO_CLIENT_ID: string;
  readonly VITE_COGNITO_DOMAIN: string;
  readonly VITE_REDIRECT_URI: string;
  readonly VITE_COGNITO_AUTHORITY_URL: string;
  readonly VITE_LOCAL_AUTH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
