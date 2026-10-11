type Env = {
  USER_AUTH_CLIENT_ID: string;
  USER_AUTH_ISSUER: string;
  USER_AUTH_SCOPES: string;
  USER_AUTH_RESOURCE: string;
};

declare global {
  interface Window {
    _env_: Env;
  }
}

if (!window._env_) {
  throw new Error(
    "window._env_ not set — /env-config.js failed to load. " +
      "The platform mounts this file; if you see this locally, host " +
      "/env-config.js from your dev server.",
  );
}

for (const key of ["USER_AUTH_CLIENT_ID", "USER_AUTH_ISSUER", "USER_AUTH_SCOPES", "USER_AUTH_RESOURCE"] as const) {
  if (!window._env_[key]) throw new Error(`${key} not set in window._env_`);
}

export const env: Env = window._env_;
