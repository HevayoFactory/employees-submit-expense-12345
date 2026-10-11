import type { ReactElement } from "react";
import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  ListingTable,
  PageContent,
  PageTitle,
} from "@wso2/oxygen-ui";
import { useNavigate } from "react-router-dom";
import { dateOnly, listTeamClaims, money, STATUS_LABEL, statusColor } from "../claims";
import { useAsync } from "../useAsync";

// Screen Decided claims (screen.team-decided) -> /team-decided.
export function TeamDecidedPage(): ReactElement {
  const navigate = useNavigate();
  // One request per decided status, merged: the unfiltered list also returns submitted claims.
  const decided = useAsync(async () => {
    const [approved, rejected] = await Promise.all([listTeamClaims("approved"), listTeamClaims("rejected")]);
    return [...approved.data, ...rejected.data].sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""));
  }, []);
  const rows = decided.data ?? [];

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Decided claims</PageTitle.Header>
      </PageTitle>
      <Card>
        <CardHeader title={`Claims you decided${decided.data ? ` (${rows.length})` : ""}`} />
        <CardContent>
          {decided.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {decided.error}
            </Alert>
          )}
          {decided.loading ? (
            <CircularProgress aria-label="Loading claims" />
          ) : (
            <ListingTable.Container>
              <ListingTable>
                <ListingTable.Head>
                  <ListingTable.Row>
                    <ListingTable.Cell>Employee</ListingTable.Cell>
                    <ListingTable.Cell>Reference</ListingTable.Cell>
                    <ListingTable.Cell align="right">Total</ListingTable.Cell>
                    <ListingTable.Cell>Decided</ListingTable.Cell>
                    <ListingTable.Cell>Status</ListingTable.Cell>
                  </ListingTable.Row>
                </ListingTable.Head>
                <ListingTable.Body>
                  {rows.length === 0 ? (
                    <ListingTable.Row>
                      <ListingTable.Cell colSpan={5}>
                        <ListingTable.EmptyState
                          title="No decisions yet"
                          description="Claims you approve or reject appear here."
                        />
                      </ListingTable.Cell>
                    </ListingTable.Row>
                  ) : (
                    rows.map((c) => (
                      <ListingTable.Row key={c.id} clickable onClick={() => navigate(`/team-claim/${c.id}`)}>
                        <ListingTable.Cell>{c.employeeName}</ListingTable.Cell>
                        <ListingTable.Cell>{c.reference}</ListingTable.Cell>
                        <ListingTable.Cell align="right">{money(c.totalCents)}</ListingTable.Cell>
                        <ListingTable.Cell>{dateOnly(c.decidedAt)}</ListingTable.Cell>
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
