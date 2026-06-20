/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Override the health-check endpoint used by the server wake-up flow. */
  readonly VITE_HEALTH_URL?: string;
  /**
   * Absolute backend health URL loaded in a hidden iframe to trigger Render's
   * navigation-based cold-start wake. Defaults to the production backend.
   */
  readonly VITE_SERVER_WAKE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
