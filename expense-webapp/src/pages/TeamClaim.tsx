import { useState, type ReactElement } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  PageContent,
  PageTitle,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { Link, useNavigate, useParams } from "react-router-dom";
import { expenseApi } from "../api";
import { Can } from "../authz/gates";
import { LinesTable } from "../components/LinesTable";
import { apiMessage, dateOnly, loadTeamClaim, money, STATUS_LABEL } from "../claims";
import { useAsync } from "../useAsync";

// Screen Team claim (screen.team-claim) -> /team-claim/:claim.
export function TeamClaimPage(): ReactElement {
  const { claim: id = "" } = useParams();
  const navigate = useNavigate();
  const claim = useAsync(() => loadTeamClaim(id), [id]);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const c = claim.data;
  const decidable = c?.status === "submitted";

  const approve = async (): Promise<void> => {
    setBusy(true);
    setFailure(null);
    const { error, response } = await expenseApi.POST("/me/team/claims/{claimId}/approve", {
      params: { path: { claimId: id } },
    });
    if (response.ok) {
      navigate("/team-queue");
      return;
    }
    setFailure(apiMessage(error, "The claim could not be approved."));
    setBusy(false);
  };

  const reject = async (): Promise<void> => {
    if (!reason.trim()) {
      setReasonError("Give the employee a reason");
      return;
    }
    setReasonError(null);
    setBusy(true);
    const { error, response } = await expenseApi.POST("/me/team/claims/{claimId}/reject", {
      params: { path: { claimId: id } },
      body: { reason: reason.trim() },
    });
    if (response.ok) {
      navigate("/team-queue");
      return;
    }
    setReasonError(apiMessage(error, "The claim could not be rejected."));
    setBusy(false);
  };

  const closeDialog = (): void => {
    setRejecting(false);
    setReason("");
    setReasonError(null);
  };

  const fields = c
    ? [
        { label: "Employee", value: c.employeeName },
        { label: "Status", value: STATUS_LABEL[c.status] },
        { label: "Submitted", value: dateOnly(c.submittedAt) },
        { label: "Total", value: money(c.totalCents) },
      ]
    : [];

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton component={<Link to="/team-queue" />}>Team approvals</PageTitle.BackButton>
        <PageTitle.Header>{c ? `Claim ${c.reference} from ${c.employeeName}` : "Team claim"}</PageTitle.Header>
        {decidable && (
          <PageTitle.Actions>
            <Can op="POST /me/team/claims/{claimId}/reject">
              <Button variant="outlined" color="error" disabled={busy} onClick={() => setRejecting(true)}>
                Reject
              </Button>
            </Can>
            <Can op="POST /me/team/claims/{claimId}/approve">
              <Button variant="contained" disabled={busy} onClick={() => void approve()}>
                Approve
              </Button>
            </Can>
          </PageTitle.Actions>
        )}
      </PageTitle>
      {claim.loading && <CircularProgress aria-label="Loading claim" />}
      {claim.error && <Alert severity="error">{claim.error}</Alert>}
      {failure && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {failure}
        </Alert>
      )}
      {c && (
        <>
          {c.status === "rejected" && c.rejectionReason && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Rejection reason: {c.rejectionReason}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {fields.map((f) => (
              <Grid key={f.label} size={{ xs: 12, md: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  {f.label}
                </Typography>
                <Typography>{f.value}</Typography>
              </Grid>
            ))}
          </Grid>
          <Card>
            <CardHeader title="Expense lines" subheader="Approve or reject the whole claim." />
            <CardContent>
              <LinesTable lines={c.lines} />
            </CardContent>
          </Card>
        </>
      )}
      <Dialog open={rejecting} onClose={busy ? undefined : closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{c ? `Reject claim ${c.reference}` : "Reject claim"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason"
            required
            multiline
            minRows={3}
            fullWidth
            autoFocus
            margin="dense"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={reasonError !== null}
            helperText={reasonError ?? "The employee sees this reason."}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" disabled={busy} onClick={closeDialog}>
            Cancel
          </Button>
          <Button variant="outlined" color="error" disabled={busy} onClick={() => void reject()}>
            Reject claim
          </Button>
        </DialogActions>
      </Dialog>
    </PageContent>
  );
}
