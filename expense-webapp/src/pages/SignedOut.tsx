import type { ReactElement } from "react";
import { Box, Button, Stack, Typography } from "@wso2/oxygen-ui";
import { signIn } from "../authz/session";

export function SignedOutPage(): ReactElement {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
      <Stack spacing={3} sx={{ alignItems: "flex-start" }}>
        <Typography variant="h4">You are signed out</Typography>
        <Button variant="contained" onClick={() => void signIn()}>
          Sign in
        </Button>
      </Stack>
    </Box>
  );
}
