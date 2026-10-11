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
  PageContent,
  PageTitle,
  Typography,
} from "@wso2/oxygen-ui";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Can } from "../authz/gates";
import { LinesTable } from "../components/LinesTable";
import { dateOnly, isEditable, loadClaim, money, STATUS_LABEL, submitClaim } from "../claims";
import { useAsync } from "../useAsync";

// Screen Claim (screen.claim-detail) -> /claim-detail/:claim.
export function ClaimDetailPage(): ReactElement {
  const { claim: id = "" } = useParams();
  const navigate = useNavigate();
  const claim = useAsync(() => loadClaim(id), [id]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const c = claim.data;

  const send = async (): Promise<void> => {
    setSending(true);
    setSendError(null);
    try {
      await submitClaim(id);
      navigate("/my-claims");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "The claim could not be submitted.");
      setSending(false);
    }
  };

  const fields = c
    ? [
        { label: "Status", value: STATUS_LABEL[c.status] },
        { label: "Submitted", value: dateOnly(c.submittedAt) },
        { label: "Total", value: money(c.totalCents) },
      ]
    : [];

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton component={<Link to="/my-claims" />}>My claims</PageTitle.BackButton>
        <PageTitle.Header>{c ? `Claim ${c.reference}` : "Claim"}</PageTitle.Header>
        {c && isEditable(c) && (
          <PageTitle.Actions>
            <Can op="PUT /me/claims/{claimId}">
              <Button variant="outlined" onClick={() => navigate(`/claim-edit/${c.id}`)}>
                Edit claim
              </Button>
            </Can>
            <Can op="POST /me/claims/{claimId}/submit">
              <Button variant="contained" disabled={sending} onClick={() => void send()}>
                {c.status === "rejected" ? "Resubmit claim" : "Submit claim"}
              </Button>
            </Can>
          </PageTitle.Actions>
        )}
      </PageTitle>
      {claim.loading && <CircularProgress aria-label="Loading claim" />}
      {claim.error && <Alert severity="error">{claim.error}</Alert>}
      {sendError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {sendError}
        </Alert>
      )}
      {c && (
        <>
          {c.status === "rejected" && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>Rejected by your manager</AlertTitle>
              {c.rejectionReason}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {fields.map((f) => (
              <Grid key={f.label} size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  {f.label}
                </Typography>
                <Typography>{f.value}</Typography>
              </Grid>
            ))}
          </Grid>
          <Card>
            <CardHeader title="Expense lines" subheader="The claim total is the sum of its lines." />
            <CardContent>
              <LinesTable lines={c.lines} />
            </CardContent>
          </Card>
        </>
      )}
    </PageContent>
  );
}
