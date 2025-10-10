let cachedEnv: Env | null = null;
let initPromise: Promise<void> | null = null;

// This gets called once at startup when running locally
const initDevEnv = async () => {
  if (cachedEnv) {
    return;
  }
  
  if (!initPromise) {
    initPromise = (async () => {
      const { getPlatformProxy } = await import("wrangler");
      const proxy = await getPlatformProxy();
      cachedEnv = proxy.env as unknown as Env;
    })();
  }
  
  await initPromise;
};

/**
 * Will only work when being accessed on the server. Obviously, CF bindings are not available in the browser.
 * @returns
 */
export async function getBindings(): Promise<Env> {
  if (import.meta.env.DEV) {
    await initDevEnv();
    return cachedEnv!;
  }

  return process.env as unknown as Env;
}
