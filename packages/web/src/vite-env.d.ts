/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Override the health-check endpoint used by the server wake-up flow. */
  readonly VITE_HEALTH_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
