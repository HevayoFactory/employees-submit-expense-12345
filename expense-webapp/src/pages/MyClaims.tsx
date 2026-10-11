import type { ReactElement } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Grid,
  ListingTable,
  PageContent,
  PageTitle,
  Typography,
} from "@wso2/oxygen-ui";
import { useNavigate } from "react-router-dom";
import { expenseApi } from "../api";
import { Can } from "../authz/gates";
import { apiMessage, dateOnly, money, STATUS_LABEL, statusColor } from "../claims";
import { useAsync } from "../useAsync";

// Screen My claims (screen.my-claims) -> /my-claims.
export function MyClaimsPage(): ReactElement {
  const navigate = useNavigate();
  const claims = useAsync(async () => {
    const { data, error } = await expenseApi.GET("/me/claims", { params: { query: { limit: 100 } } });
    if (!data) throw new Error(apiMessage(error, "Your claims could not be loaded."));
    return data;
  }, []);
  const rows = claims.data?.data ?? [];
  const open = rows.filter((c) => c.status === "submitted").length;
  const approved = rows.filter((c) => c.status === "approved" || c.status === "exported").length;
  const stats = [
    { label: "Awaiting a decision", value: open, hint: "submitted claims" },
    { label: "Approved", value: approved, hint: "including exported" },
  ];

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>My claims</PageTitle.Header>
      </PageTitle>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((s) => (
          <Grid key={s.label} size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="overline">{s.label}</Typography>
                <Typography variant="h4">{claims.data ? s.value : "-"}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.hint}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Card>
        <CardHeader
          title={`Claims${claims.data ? ` (${claims.data.count})` : ""}`}
          subheader="Open a claim to see its lines, status and any rejection reason."
          action={
            <Can op="POST /me/claims">
              <Button variant="contained" onClick={() => navigate("/claim-edit")}>
                New claim
              </Button>
            </Can>
          }
        />
        <CardContent>
          {claims.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {claims.error}
            </Alert>
          )}
          {claims.loading ? (
            <CircularProgress aria-label="Loading claims" />
          ) : (
            <ListingTable.Container>
              <ListingTable>
                <ListingTable.Head>
                  <ListingTable.Row>
                    <ListingTable.Cell>Reference</ListingTable.Cell>
                    <ListingTable.Cell align="right">Total</ListingTable.Cell>
                    <ListingTable.Cell>Submitted</ListingTable.Cell>
                    <ListingTable.Cell>Status</ListingTable.Cell>
                  </ListingTable.Row>
                </ListingTable.Head>
                <ListingTable.Body>
                  {rows.length === 0 ? (
                    <ListingTable.Row>
                      <ListingTable.Cell colSpan={4}>
                        <ListingTable.EmptyState title="No claims yet" description="Create a claim to get started." />
                      </ListingTable.Cell>
                    </ListingTable.Row>
                  ) : (
                    rows.map((c) => (
                      <ListingTable.Row key={c.id} clickable onClick={() => navigate(`/claim-detail/${c.id}`)}>
                        <ListingTable.Cell>{c.reference}</ListingTable.Cell>
                        <ListingTable.Cell align="right">{money(c.totalCents)}</ListingTable.Cell>
                        <ListingTable.Cell>{dateOnly(c.submittedAt)}</ListingTable.Cell>
                        <ListingTable.Cell>
                          <Chip size="small" label={STATUS_LABEL[c.status]} color={statusColor(c.status)} />
                        </ListingTable.Cell>
                      </ListingTable.Row>
                    ))
                  )}
                </ListingTable.Body>
              </ListingTable>
            </ListingTable.Container>
          )}
        </CardContent>
      </Card>
    </PageContent>
  );
}
