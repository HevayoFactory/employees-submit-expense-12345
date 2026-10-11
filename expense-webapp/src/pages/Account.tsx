import type { ReactElement } from "react";
import { Grid, PageContent, PageTitle, Typography } from "@wso2/oxygen-ui";
import { useHeldRoles } from "../authz/gates";
import { useProfile } from "../useProfile";

export function AccountPage(): ReactElement {
  const profile = useProfile();
  const roles = useHeldRoles();
  const fields = [
    { label: "Name", value: profile.name },
    { label: "Email", value: profile.email },
    { label: "Role", value: roles.join(", ") },
  ];
  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Account</PageTitle.Header>
      </PageTitle>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {fields.map((f) => (
          <Grid key={f.label} size={{ xs: 12, md: 4 }}>
            <Typography variant="caption" color="text.secondary">
              {f.label}
            </Typography>
            <Typography>{f.value || "-"}</Typography>
          </Grid>
        ))}
      </Grid>
      <Typography color="text.secondary">You sign in through your organization's single sign-on.</Typography>
    </PageContent>
  );
}
