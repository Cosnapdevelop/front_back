/// <reference types="vite/client" />

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
    __GA_MEASUREMENT_ID__?: string;
  }
}

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_APP_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
