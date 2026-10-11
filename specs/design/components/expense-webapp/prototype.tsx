import { useState, type ReactNode } from "react";
import {
  Alert, AppShell, Button, Detail, Dialog, EmptyState, Field, Form, Heading, Screen, Section, Stat,
  StatGroup, Table, Text, ValidationSummary, defineApp, useCollection, useDisplayState, useNav,
  useParams, useRole, useToday,
} from "@wso2/prototype-kit";

interface Employee { id: string; name: string; email: string; managerId: string }
interface Claim {
  id: string; reference: string; employeeId: string; employee: string; status: string;
  totalCents: number; submitted: string; decided: string; reason: string; exportId: string;
}
interface Line { id: string; claimId: string; date: string; amountCents: number; category: string; note: string; receipt: string }
interface ExportBatch { id: string; createdAt: string; claimCount: number; totalCents: number; file: string }

type StatusTone = "default" | "info" | "success" | "warning" | "error";

const categories = ["Meals", "Travel", "Accommodation", "Equipment", "Other"];

const employees: Employee[] = [
  { id: "e1", name: "Asha Perera", email: "asha@acme.example", managerId: "m1" },
  { id: "e2", name: "Maya Silva", email: "maya@acme.example", managerId: "m1" },
  { id: "m1", name: "Ravi Fernando", email: "ravi@acme.example", managerId: "m2" },
  { id: "m2", name: "Dilani Jayasuriya", email: "dilani@acme.example", managerId: "" },
  { id: "f1", name: "Nimal Wickrama", email: "nimal@acme.example", managerId: "m2" },
];

const claims: Claim[] = [
  { id: "c1", reference: "EC-1001", employeeId: "e1", employee: "Asha Perera", status: "Draft", totalCents: 4500, submitted: "", decided: "", reason: "", exportId: "" },
  { id: "c2", reference: "EC-1002", employeeId: "e1", employee: "Asha Perera", status: "Submitted", totalCents: 14820, submitted: "2026-01-13", decided: "", reason: "", exportId: "" },
  { id: "c3", reference: "EC-1003", employeeId: "e1", employee: "Asha Perera", status: "Rejected", totalCents: 6200, submitted: "2026-01-09", decided: "2026-01-10", reason: "The taxi needs a receipt", exportId: "" },
  { id: "c4", reference: "EC-1004", employeeId: "e2", employee: "Maya Silva", status: "Submitted", totalCents: 31000, submitted: "2026-01-12", decided: "", reason: "", exportId: "" },
  { id: "c5", reference: "EC-1005", employeeId: "e2", employee: "Maya Silva", status: "Approved", totalCents: 7800, submitted: "2026-01-11", decided: "2026-01-14", reason: "", exportId: "" },
  { id: "c6", reference: "EC-1006", employeeId: "e1", employee: "Asha Perera", status: "Exported", totalCents: 2500, submitted: "2026-01-02", decided: "2026-01-03", reason: "", exportId: "x1" },
  { id: "c7", reference: "EC-1007", employeeId: "m1", employee: "Ravi Fernando", status: "Submitted", totalCents: 9000, submitted: "2026-01-13", decided: "", reason: "", exportId: "" },
  { id: "c8", reference: "EC-1008", employeeId: "e1", employee: "Asha Perera", status: "Approved", totalCents: 12000, submitted: "2026-01-10", decided: "2026-01-14", reason: "", exportId: "" },
];

const lines: Line[] = [
  { id: "l1", claimId: "c1", date: "2026-01-10", amountCents: 4500, category: "Travel", note: "Train to client site", receipt: "ticket.pdf" },
  { id: "l2", claimId: "c2", date: "2026-01-12", amountCents: 14820, category: "Meals", note: "Team lunch", receipt: "" },
  { id: "l3", claimId: "c3", date: "2026-01-09", amountCents: 6200, category: "Travel", note: "Taxi to the airport", receipt: "" },
  { id: "l4", claimId: "c4", date: "2026-01-11", amountCents: 31000, category: "Equipment", note: "Monitor stand", receipt: "invoice.pdf" },
  { id: "l5", claimId: "c5", date: "2026-01-10", amountCents: 7800, category: "Meals", note: "Client dinner", receipt: "dinner.jpg" },
  { id: "l6", claimId: "c6", date: "2026-01-02", amountCents: 2500, category: "Other", note: "Parking", receipt: "" },
  { id: "l7", claimId: "c7", date: "2026-01-12", amountCents: 9000, category: "Accommodation", note: "Hotel, one night", receipt: "hotel.pdf" },
  { id: "l8", claimId: "c8", date: "2026-01-09", amountCents: 12000, category: "Travel", note: "Flight to Colombo", receipt: "flight.pdf" },
];

const exportBatches: ExportBatch[] = [
  { id: "x1", createdAt: "2026-01-08", claimCount: 1, totalCents: 2500, file: "payroll-2026-01-08.csv" },
];

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function tone(status: string): StatusTone {
  if (status === "Approved") return "success";
  if (status === "Rejected") return "error";
  if (status === "Submitted") return "warning";
  if (status === "Exported") return "info";
  return "default";
}

function useMe(): Employee {
  const people = useCollection<Employee>("employees");
  const role = useRole();
  const id = role === "Manager" ? "m1" : role === "PayrollOfficer" ? "f1" : "e1";
  return people.get(id) ?? people.items[0]!;
}

function Shell({ children }: { children: ReactNode }) {
  const role = useRole();
  const me = useMe();
  const nav =
    role === "PayrollOfficer"
      ? [
          { id: "nav.export", label: "Payroll export", to: "screen.export" },
          { id: "nav.people", label: "People", to: "screen.people" },
        ]
      : role === "Manager"
        ? [
            { id: "nav.my-claims", label: "My claims", to: "screen.my-claims" },
            { id: "nav.team-queue", label: "Team approvals", to: "screen.team-queue" },
            { id: "nav.team-decided", label: "Decided claims", to: "screen.team-decided" },
          ]
        : [{ id: "nav.my-claims", label: "My claims", to: "screen.my-claims" }];
  return (
    <AppShell
      id="shell"
      user={{ name: me.name, email: me.email }}
      nav={nav}
      account="screen.account"
      signOut="screen.signed-out"
    >
      {children}
    </AppShell>
  );
}

function LinesTable({ id, claimId, removable }: { id: string; claimId: string; removable: boolean }) {
  const all = useCollection<Line>("lines");
  const claimsC = useCollection<Claim>("claims");
  const mine = all.items.filter((l) => l.claimId === claimId);
  return (
    <Table
      id={id}
      columns={["Date", "Category", "Note", "Receipt", { label: "Amount", kind: "number" }]}
      rows={mine.map((l) => ({
        id: `${id}.${l.id}`,
        cells: [l.date, l.category, l.note, l.receipt === "" ? "None" : l.receipt, money(l.amountCents)],
        actions: removable
          ? [
              {
                id: `${id}.${l.id}.remove`,
                label: "Remove",
                emphasis: "danger" as const,
                onPress: () => {
                  const claim = claimsC.get(claimId);
                  if (claim) claimsC.update(claimId, { totalCents: claim.totalCents - l.amountCents });
                  all.remove(l.id);
                },
              },
            ]
          : [],
      }))}
      empty={<EmptyState id={`${id}.empty`} title="No expense lines" text="Add a line to build the claim." />}
    />
  );
}

function MyClaims() {
  const state = useDisplayState();
  const me = useMe();
  const all = useCollection<Claim>("claims");
  const mine = state === "state.empty" ? [] : all.items.filter((c) => c.employeeId === me.id);
  const open = mine.filter((c) => c.status === "Submitted").length;
  const approved = mine.filter((c) => c.status === "Approved" || c.status === "Exported").length;
  return (
    <Shell>
      <Heading id="heading.my-claims" text="My claims" />
      <StatGroup>
        <Stat id="stat.open" label="Awaiting a decision" value={String(open)} hint="submitted claims" icon="Clock" tone="warning" />
        <Stat id="stat.approved" label="Approved" value={String(approved)} hint="including exported" icon="CircleCheck" tone="success" />
      </StatGroup>
      <Section
        id="section.claims"
        title="Claims"
        count={mine.length}
        subtitle="Open a claim to see its lines, status and any rejection reason."
        actions={<Button id="btn.new-claim" label="New claim" emphasis="primary" to="screen.claim-edit" />}
      >
        <Table
          id="table.claims"
          columns={["Reference", { label: "Total", kind: "number" }, "Submitted", { label: "Status", kind: "status" }]}
          rows={mine.map((c) => ({
            id: `claim.${c.id}`,
            cells: [c.reference, money(c.totalCents), c.submitted === "" ? "Not submitted" : c.submitted],
            status: { text: c.status, tone: tone(c.status) },
            to: "screen.claim-detail",
            params: { claim: c.id },
          }))}
          empty={<EmptyState id="empty.claims" title="No claims yet" text="Create a claim to get started." />}
        />
      </Section>
    </Shell>
  );
}

function ClaimDetail() {
  const { claim: id } = useParams();
  const navigate = useNav();
  const today = useToday();
  const me = useMe();
  const all = useCollection<Claim>("claims");
  const mine = all.items.filter((c) => c.employeeId === me.id);
  const claim = (id ? all.get(id) : undefined) ?? mine[0] ?? all.items[0]!;
  const editable = claim.status === "Draft" || claim.status === "Rejected";
  const send = () => {
    all.update(claim.id, { status: "Submitted", submitted: today, reason: "", decided: "" });
    navigate.go("screen.my-claims");
  };
  return (
    <Shell>
      <Heading
        id="heading.claim"
        text={`Claim ${claim.reference}`}
        actions={
          editable ? (
            <>
              <Button id="btn.edit" label="Edit claim" to="screen.claim-edit" params={{ claim: claim.id }} />
              <Button id="btn.submit" label={claim.status === "Rejected" ? "Resubmit claim" : "Submit claim"} emphasis="primary" onPress={send} />
            </>
          ) : undefined
        }
      />
      {claim.status === "Rejected" && (
        <Alert id="alert.rejected" tone="error" title="Rejected by your manager" text={claim.reason} />
      )}
      <Detail
        id="detail.claim"
        fields={[
          { label: "Status", value: claim.status },
          { label: "Submitted", value: claim.submitted === "" ? "Not submitted" : claim.submitted },
          { label: "Total", value: money(claim.totalCents) },
        ]}
      />
      <Section id="section.lines" title="Expense lines" subtitle="The claim total is the sum of its lines.">
        <LinesTable id="table.lines" claimId={claim.id} removable={false} />
      </Section>
    </Shell>
  );
}

function ClaimEdit() {
  const { claim: id } = useParams();
  const state = useDisplayState();
  const navigate = useNav();
  const today = useToday();
  const me = useMe();
  const all = useCollection<Claim>("claims");
  const lineC = useCollection<Line>("lines");
  const claim = id ? all.get(id) : undefined;
  const failing = state === "state.validation-error";
  const add = (v: Record<string, string>) => {
    const cents = Math.round(parseFloat(v["amount"] ?? "0") * 100);
    const claimId =
      claim?.id ??
      all.create({
        reference: `EC-${1009 + all.items.length}`, employeeId: me.id, employee: me.name, status: "Draft",
        totalCents: 0, submitted: "", decided: "", reason: "", exportId: "",
      });
    lineC.create({
      claimId, date: v["date"] ?? today, amountCents: cents, category: v["category"] ?? "Other",
      note: v["note"] ?? "", receipt: v["receipt"] ?? "",
    });
    all.update(claimId, { totalCents: (claim?.totalCents ?? 0) + cents });
    navigate.go("screen.claim-detail", { claim: claimId });
  };
  return (
    <Shell>
      <Heading
        id="heading.edit"
        text={claim ? `Edit claim ${claim.reference}` : "New claim"}
        actions={claim ? <Button id="btn.done" label="Back to claim" to="screen.claim-detail" params={{ claim: claim.id }} /> : undefined}
      />
      {claim && (
        <Section id="section.lines" title="Expense lines" count={lineC.items.filter((l) => l.claimId === claim.id).length}>
          <LinesTable id="table.lines" claimId={claim.id} removable />
        </Section>
      )}
      <Section id="section.add" title="Add an expense line" subtitle="A receipt is optional.">
        {failing && (
          <ValidationSummary id="summary.line" issues={["Amount is required", "Choose a category"]} />
        )}
        <Form
          id="form.line"
          onSubmit={add}
          actions={<Button id="btn.add-line" label="Add line" emphasis="primary" submit />}
        >
          <Field id="field.date" name="date" label="Date" type="date" required defaultValue={today} />
          <Field
            id="field.amount" name="amount" label="Amount" type="number" required
            pattern="^[0-9]+(\.[0-9]{1,2})?$" patternMessage="Enter an amount such as 42.50"
            error={failing ? "Amount is required" : undefined}
          />
          <Field
            id="field.category" name="category" label="Category" type="select" options={categories} required
            defaultValue="Meals" error={failing ? "Choose a category" : undefined}
          />
          <Field id="field.note" name="note" label="Note" type="text" />
          <Field id="field.receipt" name="receipt" label="Receipt file name (optional)" type="text" placeholder="receipt.pdf" />
        </Form>
      </Section>
    </Shell>
  );
}

function TeamQueue() {
  const state = useDisplayState();
  const me = useMe();
  const people = useCollection<Employee>("employees");
  const all = useCollection<Claim>("claims");
  const team = people.items.filter((p) => p.managerId === me.id).map((p) => p.id);
  const waiting =
    state === "state.empty"
      ? []
      : all.items
          .filter((c) => team.includes(c.employeeId) && c.status === "Submitted")
          .sort((a, b) => a.submitted.localeCompare(b.submitted));
  return (
    <Shell>
      <Heading id="heading.queue" text="Team approvals" />
      <StatGroup>
        <Stat id="stat.waiting" label="Awaiting you" value={String(waiting.length)} hint="claims to decide" icon="Inbox" tone="warning" />
      </StatGroup>
      <Section id="section.queue" title="Submitted claims" count={waiting.length} subtitle="Oldest first. Only your direct reports' claims appear here.">
        <Table
          id="table.queue"
          columns={["Employee", "Reference", { label: "Total", kind: "number" }, "Submitted", { label: "Status", kind: "status" }]}
          rows={waiting.map((c) => ({
            id: `queue.${c.id}`,
            cells: [c.employee, c.reference, money(c.totalCents), c.submitted],
            status: { text: c.status, tone: tone(c.status) },
            to: "screen.team-claim",
            params: { claim: c.id },
          }))}
          empty={<EmptyState id="empty.queue" title="Nothing to approve" text="Submitted claims from your team appear here." />}
        />
      </Section>
    </Shell>
  );
}

function TeamClaim() {
  const { claim: id } = useParams();
  const state = useDisplayState();
  const navigate = useNav();
  const today = useToday();
  const all = useCollection<Claim>("claims");
  const [rejecting, setRejecting] = useState(false);
  const claim = (id ? all.get(id) : undefined) ?? all.items.find((c) => c.status === "Submitted") ?? all.items[0]!;
  const decidable = claim.status === "Submitted";
  const approve = () => {
    all.update(claim.id, { status: "Approved", decided: today });
    navigate.go("screen.team-queue");
  };
  const reject = (v: Record<string, string>) => {
    all.update(claim.id, { status: "Rejected", decided: today, reason: v["reason"] ?? "" });
    setRejecting(false);
    navigate.go("screen.team-queue");
  };
  return (
    <Shell>
      <Heading
        id="heading.team-claim"
        text={`Claim ${claim.reference} from ${claim.employee}`}
        actions={
          decidable ? (
            <>
              <Button id="btn.reject" label="Reject" emphasis="danger" onPress={() => setRejecting(true)} />
              <Button id="btn.approve" label="Approve" emphasis="primary" onPress={approve} />
            </>
          ) : undefined
        }
      />
      <Detail
        id="detail.team-claim"
        fields={[
          { label: "Employee", value: claim.employee },
          { label: "Status", value: claim.status },
          { label: "Submitted", value: claim.submitted === "" ? "Not submitted" : claim.submitted },
          { label: "Total", value: money(claim.totalCents) },
        ]}
      />
      <Section id="section.lines" title="Expense lines" subtitle="Approve or reject the whole claim.">
        <LinesTable id="table.lines" claimId={claim.id} removable={false} />
      </Section>
      <Dialog id="dialog.reject" title={`Reject claim ${claim.reference}`} open={rejecting} onClose={() => setRejecting(false)}>
        <Form
          id="form.reject"
          onSubmit={reject}
          actions={<Button id="btn.reject-confirm" label="Reject claim" emphasis="danger" submit />}
        >
          <Field
            id="field.reason" name="reason" label="Reason" type="textarea" required
            error={state === "state.validation-error" ? "Give the employee a reason" : undefined}
          />
        </Form>
      </Dialog>
    </Shell>
  );
}

function TeamDecided() {
  const state = useDisplayState();
  const me = useMe();
  const people = useCollection<Employee>("employees");
  const all = useCollection<Claim>("claims");
  const team = people.items.filter((p) => p.managerId === me.id).map((p) => p.id);
  const decided =
    state === "state.empty"
      ? []
      : all.items.filter((c) => team.includes(c.employeeId) && c.decided !== "");
  return (
    <Shell>
      <Heading id="heading.decided" text="Decided claims" />
      <Section id="section.decided" title="Claims you decided" count={decided.length}>
        <Table
          id="table.decided"
          columns={["Employee", "Reference", { label: "Total", kind: "number" }, "Decided", { label: "Status", kind: "status" }]}
          rows={decided.map((c) => ({
            id: `decided.${c.id}`,
            cells: [c.employee, c.reference, money(c.totalCents), c.decided],
            status: { text: c.status, tone: tone(c.status) },
            to: "screen.team-claim",
            params: { claim: c.id },
          }))}
          empty={<EmptyState id="empty.decided" title="No decisions yet" text="Claims you approve or reject appear here." />}
        />
      </Section>
    </Shell>
  );
}

function PayrollExport() {
  const state = useDisplayState();
  const today = useToday();
  const all = useCollection<Claim>("claims");
  const batches = useCollection<ExportBatch>("exports");
  const [notice, setNotice] = useState("");
  const pending = state === "state.empty" ? [] : all.items.filter((c) => c.status === "Approved");
  const total = pending.reduce((sum, c) => sum + c.totalCents, 0);
  const run = () => {
    if (pending.length === 0) {
      setNotice("nothing");
      return;
    }
    const batchId = batches.create({
      createdAt: today, claimCount: pending.length, totalCents: total,
      file: `payroll-${today}-${batches.items.length + 1}.csv`,
    });
    pending.forEach((c) => all.update(c.id, { status: "Exported", exportId: batchId }));
    setNotice("done");
  };
  return (
    <Shell>
      <Heading id="heading.export" text="Payroll export" />
      {notice === "nothing" && (
        <Alert id="alert.nothing" tone="info" title="Nothing to export" text="No approved claims are waiting." />
      )}
      {notice === "done" && (
        <Alert id="alert.done" tone="success" title="Export created" text="The CSV file is ready under Past exports." />
      )}
      {notice === "downloaded" && (
        <Alert id="alert.downloaded" tone="success" title="Download started" text="The earlier export file was downloaded again." />
      )}
      <StatGroup>
        <Stat id="stat.waiting" label="Waiting for export" value={String(pending.length)} hint="approved claims" icon="Receipt" tone="warning" />
        <Stat id="stat.total" label="Batch total" value={money(total)} hint="one CSV file" icon="DollarSign" />
      </StatGroup>
      <Section
        id="section.pending"
        title="Approved claims waiting"
        count={pending.length}
        subtitle="Every approved claim not yet exported goes into one batch."
        actions={<Button id="btn.export" label="Export CSV" emphasis="primary" onPress={run} />}
      >
        <Table
          id="table.pending"
          columns={["Employee", "Reference", "Approved", { label: "Total", kind: "number" }]}
          rows={pending.map((c) => ({
            id: `pending.${c.id}`,
            cells: [c.employee, c.reference, c.decided, money(c.totalCents)],
          }))}
          empty={<EmptyState id="empty.pending" title="Nothing to export" text="Approved claims appear here until they are exported." />}
        />
      </Section>
      <Section id="section.history" title="Past exports" count={batches.items.length} subtitle="Earlier files can be downloaded again.">
        <Table
          id="table.history"
          columns={["File", "Created", { label: "Claims", kind: "number" }, { label: "Total", kind: "number" }]}
          rows={batches.items.map((b) => ({
            id: `export.${b.id}`,
            cells: [b.file, b.createdAt, String(b.claimCount), money(b.totalCents)],
            actions: [{ id: `export.${b.id}.download`, label: "Download", onPress: () => setNotice("downloaded") }],
          }))}
          empty={<EmptyState id="empty.history" title="No exports yet" text="Created exports are listed here." />}
        />
      </Section>
    </Shell>
  );
}

function People() {
  const state = useDisplayState();
  const people = useCollection<Employee>("employees");
  const [editing, setEditing] = useState("");
  const person = people.get(editing);
  const shown = state === "state.empty" ? [] : people.items;
  const nameOf = (id: string) => people.get(id)?.name ?? "Not set";
  const choices = people.items.filter((p) => p.id !== editing).map((p) => p.name);
  const save = (v: Record<string, string>) => {
    const chosen = people.items.find((p) => p.name === v["manager"]);
    if (person && chosen) people.update(person.id, { managerId: chosen.id });
    setEditing("");
  };
  return (
    <Shell>
      <Heading id="heading.people" text="People" />
      <Section id="section.people" title="Employees and line managers" count={shown.length} subtitle="An employee with no manager has no one to decide their claims.">
        <Table
          id="table.people"
          columns={["Name", "Email", "Line manager"]}
          rows={shown.map((p) => ({
            id: `person.${p.id}`,
            cells: [p.name, p.email, nameOf(p.managerId)],
            actions: [{ id: `person.${p.id}.set`, label: "Set manager", onPress: () => setEditing(p.id) }],
          }))}
          empty={<EmptyState id="empty.people" title="No employees yet" text="Employees appear after they first sign in." />}
        />
      </Section>
      <Dialog id="dialog.manager" title={`Line manager for ${person?.name ?? "employee"}`} open={person !== undefined} onClose={() => setEditing("")}>
        <Form
          id="form.manager"
          onSubmit={save}
          actions={<Button id="btn.manager-save" label="Save" emphasis="primary" submit />}
        >
          <Field
            id="field.manager" name="manager" label="Line manager" type="select" options={choices} required
            error={state === "state.validation-error" ? "Choose a line manager" : undefined}
          />
        </Form>
      </Dialog>
    </Shell>
  );
}

function Account() {
  const me = useMe();
  const role = useRole();
  return (
    <Shell>
      <Heading id="heading.account" text="Account" />
      <Detail
        id="detail.account"
        fields={[
          { label: "Name", value: me.name },
          { label: "Email", value: me.email },
          { label: "Role", value: role },
        ]}
      />
      <Text id="text.account" text="You sign in through your organization's single sign-on." />
    </Shell>
  );
}

function SignedOut() {
  const role = useRole();
  return (
    <Screen>
      <Heading id="heading.signed-out" text="You are signed out" />
      <Button
        id="btn.sign-in"
        label="Sign in"
        emphasis="primary"
        to={role === "PayrollOfficer" ? "screen.export" : "screen.my-claims"}
      />
    </Screen>
  );
}

export default defineApp({
  screens: {
    "screen.my-claims": MyClaims,
    "screen.claim-detail": ClaimDetail,
    "screen.claim-edit": ClaimEdit,
    "screen.team-queue": TeamQueue,
    "screen.team-claim": TeamClaim,
    "screen.team-decided": TeamDecided,
    "screen.export": PayrollExport,
    "screen.people": People,
    "screen.account": Account,
    "screen.signed-out": SignedOut,
  },
  data: { employees, claims, lines, exports: exportBatches },
});
