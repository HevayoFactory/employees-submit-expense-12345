import { useEffect, useRef, useState, type ReactElement } from "react";
import { Alert, Box, CircularProgress, Typography } from "@wso2/oxygen-ui";
import { handleCallback } from "../authz/session";

/** /callback: finishes the OIDC redirect once, then returns to the app root. */
export function CallbackPage(): ReactElement {
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    handleCallback().then(
      () => {
        // The silent-renew leg runs in a hidden iframe: do not navigate it.
        if (window.self === window.top) window.location.replace("/");
      },
      (e: unknown) => setError(e instanceof Error ? e.message : "Sign-in failed"),
    );
  }, []);

  return (
    <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
      {error ? (
        <Alert severity="error">Sign-in failed: {error}</Alert>
      ) : (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <CircularProgress size={24} />
          <Typography>Completing sign-in…</Typography>
        </Box>
      )}
    </Box>
  );
}
