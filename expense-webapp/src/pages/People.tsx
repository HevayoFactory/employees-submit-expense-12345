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
  ListingTable,
  MenuItem,
  PageContent,
  PageTitle,
  TextField,
} from "@wso2/oxygen-ui";
import { Can } from "../authz/gates";
import { expenseApi } from "../api";
import type { components } from "../generated/expense-api";
import { apiMessage } from "../claims";
import { useAsync } from "../useAsync";

type Employee = components["schemas"]["Employee"];

// Screen People (screen.people) -> /people.
export function PeoplePage(): ReactElement {
  const people = useAsync(async () => {
    const { data, error } = await expenseApi.GET("/employees", { params: { query: { limit: 100 } } });
    if (!data) throw new Error(apiMessage(error, "Employees could not be loaded."));
    return data.data;
  }, []);
  const rows = people.data ?? [];
  const [editing, setEditing] = useState<Employee | null>(null);
  const [managerId, setManagerId] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const open = (p: Employee) => {
    setEditing(p);
    setManagerId(p.managerId ?? "");
    setFieldError(null);
  };
  const save = async () => {
    if (!editing) return;
    if (!managerId) {
      setFieldError("Choose a line manager");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await expenseApi.PUT("/employees/{employeeId}/manager", {
        params: { path: { employeeId: editing.id } },
        body: { managerId },
      });
      if (!data) {
        setFieldError(apiMessage(error, "The line manager could not be saved."));
      } else {
        setEditing(null);
        people.reload();
      }
    } catch (e) {
      setFieldError(e instanceof Error ? e.message : "The line manager could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>People</PageTitle.Header>
      </PageTitle>
      <Card>
        <CardHeader
          title={`Employees and line managers${people.data ? ` (${rows.length})` : ""}`}
          subheader="An employee with no manager has no one to decide their claims."
        />
        <CardContent>
          {people.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {people.error}
            </Alert>
          )}
          {people.loading ? (
            <CircularProgress aria-label="Loading employees" />
          ) : (
            <ListingTable.Container>
              <ListingTable>
                <ListingTable.Head>
                  <ListingTable.Row>
                    <ListingTable.Cell>Name</ListingTable.Cell>
                    <ListingTable.Cell>Email</ListingTable.Cell>
                    <ListingTable.Cell>Line manager</ListingTable.Cell>
                    <ListingTable.Cell align="right">Actions</ListingTable.Cell>
                  </ListingTable.Row>
                </ListingTable.Head>
                <ListingTable.Body>
                  {rows.length === 0 ? (
                    <ListingTable.Row>
                      <ListingTable.Cell colSpan={4}>
                        <ListingTable.EmptyState
                          title="No employees yet"
                          description="Employees appear after they first sign in."
                        />
                      </ListingTable.Cell>
                    </ListingTable.Row>
                  ) : (
                    rows.map((p) => (
                      <ListingTable.Row key={p.id}>
                        <ListingTable.Cell>{p.name}</ListingTable.Cell>
                        <ListingTable.Cell>{p.email}</ListingTable.Cell>
                        <ListingTable.Cell>{p.managerName ?? "Not set"}</ListingTable.Cell>
                        <ListingTable.Cell align="right">
                          <Can op="PUT /employees/{employeeId}/manager">
                            <Button size="small" variant="outlined" onClick={() => open(p)}>
                              Set manager
                            </Button>
                          </Can>
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
      <Dialog open={editing !== null} onClose={() => setEditing(null)} fullWidth maxWidth="xs">
        <DialogTitle>{`Line manager for ${editing?.name ?? "employee"}`}</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            required
            label="Line manager"
            value={managerId}
            onChange={(e) => {
              setManagerId(e.target.value);
              setFieldError(null);
            }}
            error={fieldError !== null}
            helperText={fieldError ?? undefined}
            sx={{ mt: 1 }}
          >
            {rows
              .filter((p) => p.id !== editing?.id)
              .map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </PageContent>
  );
}
