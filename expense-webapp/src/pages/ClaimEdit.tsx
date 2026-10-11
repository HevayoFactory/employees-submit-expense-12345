import { useState, type FormEvent, type ReactElement } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { expenseApi } from "../api";
import { LinesTable } from "../components/LinesTable";
import {
  apiMessage,
  fileToReceipt,
  isEditable,
  loadClaim,
  MAX_RECEIPT_BYTES,
  saveLines,
  toCents,
  toInput,
  type ExpenseLine,
  type LineChange,
} from "../claims";
import { useAsync } from "../useAsync";

const today = (): string => new Date().toISOString().slice(0, 10);

type Errors = Partial<Record<"date" | "amount" | "category" | "receipt", string>>;

// Screens Edit claim (screen.claim-edit): /claim-edit (a new claim) and
// /claim-edit/:claim (a draft or rejected one).
export function ClaimEditPage(): ReactElement {
  const { claim: id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const claim = useAsync(() => (id ? loadClaim(id) : Promise.resolve(null)), [id]);
  const categories = useAsync(async () => {
    const { data, error } = await expenseApi.GET("/categories");
    if (!data) throw new Error(apiMessage(error, "The categories could not be loaded."));
    return data;
  }, []);

  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const warning = (location.state as { warning?: string } | null)?.warning;

  const current = claim.data;
  const keep = (lines: readonly ExpenseLine[]): LineChange[] =>
    lines.map((l) => ({ input: toInput(l), keepReceiptOf: l.receiptFileName ? l.id : undefined }));

  const remove = async (line: ExpenseLine): Promise<void> => {
    if (!current) return;
    setFailure(null);
    const rest = current.lines.filter((l) => l.id !== line.id);
    if (rest.length === 0) {
      setFailure("A claim needs at least one expense line. Add another line before removing this one.");
      return;
    }
    setBusy(true);
    try {
      const saved = await saveLines(current.id, keep(rest));
      if (saved.receiptError) setFailure(`Lines saved, but a receipt was not: ${saved.receiptError}`);
      claim.reload();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "The line could not be removed.");
    } finally {
      setBusy(false);
    }
  };

  const add = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const next: Errors = {};
    const cents = toCents(amount);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = "Date is required";
    if (amount.trim() === "") next.amount = "Amount is required";
    else if (cents === null) next.amount = "Enter an amount such as 42.50";
    if (!categoryId) next.category = "Choose a category";
    if (file && file.size > MAX_RECEIPT_BYTES) next.receipt = "The receipt must be 5 MB or smaller";
    setErrors(next);
    setFailure(null);
    if (Object.keys(next).length > 0 || cents === null) return;

    setBusy(true);
    try {
      const receipt = file ? await fileToReceipt(file) : undefined;
      const added: LineChange = {
        input: { date, amountCents: cents, categoryId, ...(note.trim() ? { note: note.trim() } : {}) },
        receipt,
      };
      const saved = await saveLines(current?.id ?? null, [...keep(current?.lines ?? []), added]);
      if (saved.receiptError) {
        const message = `The line was saved, but its receipt was not: ${saved.receiptError}`;
        if (current) {
          setFailure(message);
          claim.reload();
          setBusy(false);
        } else {
          navigate(`/claim-edit/${saved.claim.id}`, { replace: true, state: { warning: message } });
        }
        return;
      }
      navigate(`/claim-detail/${saved.claim.id}`);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "The line could not be added.");
      setBusy(false);
    }
  };

  const back = current ? `/claim-detail/${current.id}` : "/my-claims";
  const blocked = current !== null && !isEditable(current);
  const summary = Object.values(errors);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.BackButton component={<Link to={back} />}>{current ? "Claim" : "My claims"}</PageTitle.BackButton>
        <PageTitle.Header>{current ? `Edit claim ${current.reference}` : "New claim"}</PageTitle.Header>
      </PageTitle>
      {claim.loading && <CircularProgress aria-label="Loading claim" />}
      {claim.error && <Alert severity="error">{claim.error}</Alert>}
      {warning && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {warning}
        </Alert>
      )}
      {blocked && (
        <Alert severity="info">
          This claim is {current.status} and can no longer be edited.
        </Alert>
      )}
      {!claim.loading && !claim.error && !blocked && (
        <Stack spacing={3}>
          {current && (
            <Card>
              <CardHeader title={`Expense lines (${current.lines.length})`} />
              <CardContent>
                <LinesTable lines={current.lines} onRemove={(l) => void remove(l)} busy={busy} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader title="Add an expense line" subheader="A receipt is optional (up to 5 MB)." />
            <CardContent>
              <Box component="form" onSubmit={(e: FormEvent) => void add(e)} noValidate>
                <Stack spacing={2}>
                  {summary.length > 0 && (
                    <Alert severity="error">
                      {summary.map((m) => (
                        <Typography key={m} variant="body2">{m}</Typography>
                      ))}
                    </Alert>
                  )}
                  {failure && <Alert severity="error">{failure}</Alert>}
                  <TextField
                    label="Date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    error={!!errors.date}
                    helperText={errors.date}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    label="Amount"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    error={!!errors.amount}
                    helperText={errors.amount}
                    slotProps={{ htmlInput: { inputMode: "decimal" } }}
                  />
                  <TextField
                    select
                    label="Category"
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    error={!!errors.category}
                    helperText={errors.category}
                  >
                    {(categories.data ?? []).map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
                  <TextField
                    label="Receipt (optional)"
                    type="file"
                    onChange={(e) => setFile((e.target as HTMLInputElement).files?.[0] ?? null)}
                    error={!!errors.receipt}
                    helperText={errors.receipt}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <Stack direction="row" justifyContent="flex-end" spacing={2}>
                    <Button type="submit" variant="contained" disabled={busy}>
                      Add line
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Stack>
      )}
    </PageContent>
  );
}
