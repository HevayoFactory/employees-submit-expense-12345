import type { ReactElement } from "react";
import {
  Alert,
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
import { dateOnly, listTeamClaims, money, STATUS_LABEL, statusColor } from "../claims";
import { useAsync } from "../useAsync";

// Screen Team approvals (screen.team-queue) -> /team-queue.
export function TeamQueuePage(): ReactElement {
  const navigate = useNavigate();
  const queue = useAsync(() => listTeamClaims("submitted"), []);
  // The API lists oldest submission first; the order is kept as received.
  const rows = queue.data?.data ?? [];

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Team approvals</PageTitle.Header>
      </PageTitle>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="overline">Awaiting you</Typography>
              <Typography variant="h4">{queue.data ? rows.length : "-"}</Typography>
              <Typography variant="caption" color="text.secondary">
                claims to decide
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Card>
        <CardHeader
          title={`Submitted claims${queue.data ? ` (${rows.length})` : ""}`}
          subheader="Oldest first. Only your direct reports' claims appear here."
        />
        <CardContent>
          {queue.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {queue.error}
            </Alert>
          )}
          {queue.loading ? (
            <CircularProgress aria-label="Loading claims" />
          ) : (
            <ListingTable.Container>
              <ListingTable>
                <ListingTable.Head>
                  <ListingTable.Row>
                    <ListingTable.Cell>Employee</ListingTable.Cell>
                    <ListingTable.Cell>Reference</ListingTable.Cell>
                    <ListingTable.Cell align="right">Total</ListingTable.Cell>
                    <ListingTable.Cell>Submitted</ListingTable.Cell>
                    <ListingTable.Cell>Status</ListingTable.Cell>
                  </ListingTable.Row>
                </ListingTable.Head>
                <ListingTable.Body>
                  {rows.length === 0 ? (
                    <ListingTable.Row>
                      <ListingTable.Cell colSpan={5}>
                        <ListingTable.EmptyState
                          title="Nothing to approve"
                          description="Submitted claims from your team appear here."
                        />
                      </ListingTable.Cell>
                    </ListingTable.Row>
                  ) : (
                    rows.map((c) => (
                      <ListingTable.Row key={c.id} clickable onClick={() => navigate(`/team-claim/${c.id}`)}>
                        <ListingTable.Cell>{c.employeeName}</ListingTable.Cell>
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
