import { useState, type ReactElement } from "react";
import {
  Alert,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Grid,
  ListingTable,
  PageContent,
  PageTitle,
  Typography,
} from "@wso2/oxygen-ui";
import { Can } from "../authz/gates";
import { expenseApi } from "../api";
import { apiMessage, dateOnly, money } from "../claims";
import { useAsync } from "../useAsync";

type Notice = { kind: "nothing" | "done" | "downloaded" | "error"; text?: string } | null;

function StatTile(props: { label: string; value: string; hint: string }): ReactElement {
  return (
    <Card>
      <CardContent>
        <Typography variant="overline">{props.label}</Typography>
        <Typography variant="h4">{props.value}</Typography>
        <Typography variant="caption" color="text.secondary">
          {props.hint}
        </Typography>
      </CardContent>
    </Card>
  );
}

// Screen Payroll export (screen.export) -> /export.
export function PayrollExportPage(): ReactElement {
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const pending = useAsync(async () => {
    const { data, error } = await expenseApi.GET("/export-candidates", { params: { query: { limit: 100 } } });
    if (!data) throw new Error(apiMessage(error, "The waiting claims could not be loaded."));
    return data.data;
  }, []);
  const history = useAsync(async () => {
    const { data, error } = await expenseApi.GET("/exports", { params: { query: { limit: 100 } } });
    if (!data) throw new Error(apiMessage(error, "Past exports could not be loaded."));
    return [...data.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, []);
  const waiting = pending.data ?? [];
  const past = history.data ?? [];
  const total = waiting.reduce((sum, c) => sum + c.totalCents, 0);

  const runExport = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await expenseApi.POST("/exports");
      if (res.response.status === 409) {
        setNotice({ kind: "nothing" });
      } else if (!res.data) {
        setNotice({ kind: "error", text: apiMessage(res.error, "The export could not be created.") });
      } else {
        setNotice({ kind: "done" });
      }
      pending.reload();
      history.reload();
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "The export could not be created." });
    } finally {
      setBusy(false);
    }
  };

  // The file needs the bearer token, so it goes through the authenticated client as a blob.
  const download = async (id: string, fileName: string) => {
    setNotice(null);
    try {
      const { data, error } = await expenseApi.GET("/exports/{exportId}/file", {
        params: { path: { exportId: id } },
        parseAs: "blob",
      });
      if (!data) throw new Error(apiMessage(error, "The file could not be downloaded."));
      const url = URL.createObjectURL(data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotice({ kind: "downloaded" });
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "The file could not be downloaded." });
    }
  };

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Payroll export</PageTitle.Header>
      </PageTitle>
      {notice?.kind === "nothing" && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>Nothing to export</AlertTitle>No approved claims are waiting.
        </Alert>
      )}
      {notice?.kind === "done" && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <AlertTitle>Export created</AlertTitle>The CSV file is ready under Past exports.
        </Alert>
      )}
      {notice?.kind === "downloaded" && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <AlertTitle>Download started</AlertTitle>The export file was downloaded.
        </Alert>
      )}
      {notice?.kind === "error" && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {notice.text}
        </Alert>
      )}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatTile label="Waiting for export" value={String(waiting.length)} hint="approved claims" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatTile label="Batch total" value={money(total)} hint="one CSV file" />
        </Grid>
      </Grid>
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title={`Approved claims waiting${pending.data ? ` (${waiting.length})` : ""}`}
          subheader="Every approved claim not yet exported goes into one batch."
          action={
            <Can op="POST /exports">
              <Button variant="contained" onClick={runExport} disabled={busy}>
                Export CSV
              </Button>
            </Can>
          }
        />
        <CardContent>
          {pending.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {pending.error}
            </Alert>
          )}
          {pending.loading ? (
            <CircularProgress aria-label="Loading claims" />
          ) : (
            <ListingTable.Container>
              <ListingTable>
                <ListingTable.Head>
                  <ListingTable.Row>
                    <ListingTable.Cell>Employee</ListingTable.Cell>
                    <ListingTable.Cell>Reference</ListingTable.Cell>
                    <ListingTable.Cell>Approved</ListingTable.Cell>
                    <ListingTable.Cell align="right">Total</ListingTable.Cell>
                  </ListingTable.Row>
                </ListingTable.Head>
                <ListingTable.Body>
                  {waiting.length === 0 ? (
                    <ListingTable.Row>
                      <ListingTable.Cell colSpan={4}>
                        <ListingTable.EmptyState
                          title="Nothing to export"
                          description="Approved claims appear here until they are exported."
                        />
                      </ListingTable.Cell>
                    </ListingTable.Row>
                  ) : (
                    waiting.map((c) => (
                      <ListingTable.Row key={c.id}>
                        <ListingTable.Cell>{c.employeeName}</ListingTable.Cell>
                        <ListingTable.Cell>{c.reference}</ListingTable.Cell>
                        <ListingTable.Cell>{dateOnly(c.approvedAt)}</ListingTable.Cell>
                        <ListingTable.Cell align="right">{money(c.totalCents)}</ListingTable.Cell>
                      </ListingTable.Row>
                    ))
                  )}
                </ListingTable.Body>
              </ListingTable>
            </ListingTable.Container>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader
          title={`Past exports${history.data ? ` (${past.length})` : ""}`}
          subheader="Earlier files can be downloaded again."
        />
        <CardContent>
          {history.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {history.error}
            </Alert>
          )}
          {history.loading ? (
            <CircularProgress aria-label="Loading exports" />
          ) : (
            <ListingTable.Container>
              <ListingTable>
                <ListingTable.Head>
                  <ListingTable.Row>
                    <ListingTable.Cell>File</ListingTable.Cell>
                    <ListingTable.Cell>Created</ListingTable.Cell>
                    <ListingTable.Cell align="right">Claims</ListingTable.Cell>
                    <ListingTable.Cell align="right">Total</ListingTable.Cell>
                    <ListingTable.Cell align="right">Actions</ListingTable.Cell>
                  </ListingTable.Row>
                </ListingTable.Head>
                <ListingTable.Body>
                  {past.length === 0 ? (
                    <ListingTable.Row>
                      <ListingTable.Cell colSpan={5}>
                        <ListingTable.EmptyState title="No exports yet" description="Created exports are listed here." />
                      </ListingTable.Cell>
                    </ListingTable.Row>
                  ) : (
                    past.map((b) => (
                      <ListingTable.Row key={b.id}>
                        <ListingTable.Cell>{b.fileName}</ListingTable.Cell>
                        <ListingTable.Cell>{dateOnly(b.createdAt)}</ListingTable.Cell>
                        <ListingTable.Cell align="right">{b.claimCount}</ListingTable.Cell>
                        <ListingTable.Cell align="right">{money(b.totalCents)}</ListingTable.Cell>
                        <ListingTable.Cell align="right">
                          <Button size="small" variant="outlined" onClick={() => download(b.id, b.fileName)}>
                            Download
                          </Button>
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
