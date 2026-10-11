import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/expense-api";
import { scopesFromToken } from "./authz/session";

// State lives in the PAGE: any full page load re-runs this module and restores
// the seed. Only in-app navigation carries a change forward.
// No scope checks here: mock/authz/gateway.ts answers 401 from the contract.
// What a handler owes is its path's reach: /me/... = the caller's rows (404 for
// someone else's), /me/team/... = direct reports', everything else = all rows.

type Claim = components["schemas"]["Claim"];
type ClaimStatus = components["schemas"]["ClaimStatus"];
type Employee = components["schemas"]["Employee"];
type ExportBatch = components["schemas"]["ExportBatch"];
type LineInput = components["schemas"]["ExpenseLineInput"];

const categories = ["Meals", "Travel", "Accommodation", "Equipment", "Other"].map((name, i) => ({
  id: `cat${i + 1}`,
  name,
}));
const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

interface Person { id: string; name: string; email: string; managerId: string | null }
let people: Person[] = [
  { id: "e1", name: "Asha Perera", email: "asha@acme.example", managerId: "m1" },
  { id: "e2", name: "Maya Silva", email: "maya@acme.example", managerId: "m1" },
  { id: "m1", name: "Ravi Fernando", email: "ravi@acme.example", managerId: "m2" },
  { id: "m2", name: "Dilani Jayasuriya", email: "dilani@acme.example", managerId: null },
  { id: "f1", name: "Nimal Wickrama", email: "nimal@acme.example", managerId: "m2" },
];
const nameOf = (id: string | null) => people.find((p) => p.id === id)?.name ?? null;
const asEmployee = (p: Person): Employee => ({
  id: p.id, name: p.name, email: p.email, managerId: p.managerId, managerName: nameOf(p.managerId),
});

/**
 * Who the mock speaks for, derived from the scopes in the bearer token the way a
 * gateway assertion would carry a `sub`: never from a query parameter.
 */
function caller(request: Request): Person {
  const scopes = scopesFromToken(request.headers.get("Authorization"));
  const id = scopes.includes("claims:read-team") ? "m1" : scopes.includes("exports:read") ? "f1" : "e1";
  return people.find((p) => p.id === id)!;
}

const line = (id: string, date: string, amountCents: number, cat: string, note: string, receipt: string | null) => ({
  id, date, amountCents, categoryId: cat, categoryName: categoryName(cat), note, receiptFileName: receipt,
});

const iso = (d: string) => (d ? `${d}T09:00:00Z` : null);
const claimSeed = (
  id: string, ref: string, emp: string, status: ClaimStatus, submitted: string, decided: string,
  reason: string, exportId: string, lines: Claim["lines"],
): Claim => ({
  id, reference: ref, employeeId: emp, employeeName: nameOf(emp)!, status,
  totalCents: lines.reduce((s, l) => s + l.amountCents, 0),
  submittedAt: iso(submitted), decidedAt: iso(decided), rejectionReason: reason || null,
  exportBatchId: exportId || null, lines,
});

let claims: Claim[] = [
  claimSeed("c1", "EC-1001", "e1", "draft", "", "", "", "", [line("l1", "2026-01-10", 4500, "cat2", "Train to client site", "ticket.pdf")]),
  claimSeed("c2", "EC-1002", "e1", "submitted", "2026-01-13", "", "", "", [line("l2", "2026-01-12", 14820, "cat1", "Team lunch", null)]),
  claimSeed("c3", "EC-1003", "e1", "rejected", "2026-01-09", "2026-01-10", "The taxi needs a receipt", "", [line("l3", "2026-01-09", 6200, "cat2", "Taxi to the airport", null)]),
  claimSeed("c4", "EC-1004", "e2", "submitted", "2026-01-12", "", "", "", [line("l4", "2026-01-11", 31000, "cat4", "Monitor stand", "invoice.pdf")]),
  claimSeed("c5", "EC-1005", "e2", "approved", "2026-01-11", "2026-01-14", "", "", [line("l5", "2026-01-10", 7800, "cat1", "Client dinner", "dinner.jpg")]),
  claimSeed("c6", "EC-1006", "e1", "exported", "2026-01-02", "2026-01-03", "", "x1", [line("l6", "2026-01-02", 2500, "cat5", "Parking", null)]),
  claimSeed("c7", "EC-1007", "m1", "submitted", "2026-01-13", "", "", "", [line("l7", "2026-01-12", 9000, "cat3", "Hotel, one night", "hotel.pdf")]),
  claimSeed("c8", "EC-1008", "e1", "approved", "2026-01-10", "2026-01-14", "", "", [line("l8", "2026-01-09", 12000, "cat2", "Flight to Colombo", "flight.pdf")]),
] as Claim[];
// employeeId is a Claim field in the contract; keep it for reach filtering.

let batches: ExportBatch[] = [
  { id: "x1", createdAt: "2026-01-08T09:00:00Z", claimCount: 1, totalCents: 2500, fileName: "payroll-2026-01-08.csv" },
];
let nextClaim = 1009;
let nextLine = 100;
let nextBatch = 2;

const err = (status: number, message: string, description?: string) =>
  HttpResponse.json({ code: status, message, description }, { status });

const summary = (c: Claim) => ({
  id: c.id, reference: c.reference, employeeName: c.employeeName, status: c.status,
  totalCents: c.totalCents, submittedAt: c.submittedAt, decidedAt: c.decidedAt,
});

function page<T>(items: T[], url: URL) {
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  return {
    count: items.length,
    next: offset + limit < items.length ? `?limit=${limit}&offset=${offset + limit}` : null,
    previous: offset > 0 ? `?limit=${limit}&offset=${Math.max(0, offset - limit)}` : null,
    data: items.slice(offset, offset + limit),
  };
}

// A replace carries no line ids (ExpenseLineInput), so every line is new and no
// receipt survives it: the client re-attaches the ones it keeps.
function buildLines(inputs: LineInput[]): Claim["lines"] {
  return inputs.map((l) => ({
    id: `l${nextLine++}`,
    date: l.date, amountCents: l.amountCents, categoryId: l.categoryId, note: l.note ?? "",
    categoryName: categoryName(l.categoryId),
    receiptFileName: null,
  }));
}

function validLines(body: unknown): LineInput[] | null {
  const lines = (body as { lines?: LineInput[] } | null)?.lines;
  if (!Array.isArray(lines) || lines.length === 0) return null;
  const ok = lines.every(
    (l) => l && /^\d{4}-\d{2}-\d{2}$/.test(l.date) && Number.isInteger(l.amountCents) && l.amountCents >= 1 &&
      categories.some((c) => c.id === l.categoryId),
  );
  return ok ? lines : null;
}

const mine = (request: Request, id: string) =>
  claims.find((c) => c.id === id && (c as Claim & { employeeId: string }).employeeId === caller(request).id);
const teamOf = (request: Request) => {
  const me = caller(request).id;
  return claims.filter((c) => people.find((p) => p.id === (c as Claim & { employeeId: string }).employeeId)?.managerId === me);
};
const teamClaim = (request: Request, id: string) => teamOf(request).find((c) => c.id === id);

// Stored receipts by line id. Seeded receipts have no content of their own, so
// they answer a tiny placeholder document.
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const stored = new Map<string, { fileName: string; contentType: string; contentBase64: string }>();
const receipt = (c: Claim, lineId: string) => {
  const l = c.lines.find((x) => x.id === lineId);
  if (!l?.receiptFileName) return err(404, "Receipt not found");
  return HttpResponse.json(
    stored.get(lineId) ?? { fileName: l.receiptFileName, contentType: "application/pdf", contentBase64: "JVBERi0xLjQK" },
  );
};
const decodedBytes = (b64: string) => Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);

const byStatus = (items: Claim[], url: URL) => {
  const s = url.searchParams.get("status");
  return s ? items.filter((c) => c.status === s) : items;
};

export const handlers = [
  http.get("/api/me", ({ request }) => HttpResponse.json(asEmployee(caller(request)))),
  http.get("/api/categories", () => HttpResponse.json(categories)),

  http.get("/api/me/claims", ({ request }) => {
    const me = caller(request).id;
    const own = claims.filter((c) => (c as Claim & { employeeId: string }).employeeId === me);
    return HttpResponse.json(page(byStatus(own, new URL(request.url)).map(summary), new URL(request.url)));
  }),
  http.post("/api/me/claims", async ({ request }) => {
    const lines = validLines(await request.json().catch(() => null));
    if (!lines) return err(400, "Invalid claim", "A claim needs at least one valid expense line.");
    const me = caller(request);
    const built = buildLines(lines);
    const created = {
      id: `c${nextClaim}`, reference: `EC-${nextClaim++}`, employeeId: me.id, employeeName: me.name,
      status: "draft", totalCents: built.reduce((s, l) => s + l.amountCents, 0),
      submittedAt: null, decidedAt: null, rejectionReason: null, exportBatchId: null, lines: built,
    } as Claim;
    claims = [...claims, created];
    return HttpResponse.json(created, { status: 201 });
  }),
  http.get("/api/me/claims/:claimId", ({ request, params }) => {
    const c = mine(request, String(params.claimId));
    return c ? HttpResponse.json(c) : err(404, "Claim not found");
  }),
  http.put("/api/me/claims/:claimId", async ({ request, params }) => {
    const c = mine(request, String(params.claimId));
    if (!c) return err(404, "Claim not found");
    if (c.status !== "draft" && c.status !== "rejected") return err(409, "Claim is not editable");
    const lines = validLines(await request.json().catch(() => null));
    if (!lines) return err(400, "Invalid claim", "A claim needs at least one valid expense line.");
    const built = buildLines(lines);
    const updated = { ...c, lines: built, totalCents: built.reduce((s, l) => s + l.amountCents, 0) };
    claims = claims.map((x) => (x.id === c.id ? updated : x));
    return HttpResponse.json(updated);
  }),
  http.post("/api/me/claims/:claimId/submit", ({ request, params }) => {
    const c = mine(request, String(params.claimId));
    if (!c) return err(404, "Claim not found");
    if (c.status !== "draft" && c.status !== "rejected") return err(409, "Claim is not submittable");
    const updated: Claim = {
      ...c, status: "submitted", submittedAt: new Date().toISOString(), decidedAt: null, rejectionReason: null,
    };
    claims = claims.map((x) => (x.id === c.id ? updated : x));
    return HttpResponse.json(updated);
  }),
  http.get("/api/me/claims/:claimId/expense-lines/:lineId/receipt", ({ request, params }) => {
    const c = mine(request, String(params.claimId));
    return c ? receipt(c, String(params.lineId)) : err(404, "Claim not found");
  }),
  http.put("/api/me/claims/:claimId/expense-lines/:lineId/receipt", async ({ request, params }) => {
    const c = mine(request, String(params.claimId));
    if (!c) return err(404, "Claim not found");
    if (c.status !== "draft" && c.status !== "rejected") return err(409, "Claim is not editable");
    const body = (await request.json().catch(() => null)) as { fileName?: string; contentType?: string; contentBase64?: string } | null;
    if (!body?.fileName || !body.contentType || !body.contentBase64) return err(400, "Invalid receipt");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body.contentBase64)) return err(400, "Invalid receipt", "The receipt content is not valid base64.");
    if (decodedBytes(body.contentBase64) > MAX_RECEIPT_BYTES) return err(400, "Invalid receipt", "The receipt is larger than 5 MB.");
    if (!c.lines.some((l) => l.id === params.lineId)) return err(404, "Line not found");
    stored.set(String(params.lineId), { fileName: body.fileName, contentType: body.contentType, contentBase64: body.contentBase64 });
    const updated = {
      ...c,
      lines: c.lines.map((l) => (l.id === params.lineId ? { ...l, receiptFileName: body.fileName! } : l)),
    };
    claims = claims.map((x) => (x.id === c.id ? updated : x));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/me/team/claims", ({ request }) => {
    const url = new URL(request.url);
    const items = byStatus(teamOf(request), url).sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));
    return HttpResponse.json(page(items.map(summary), url));
  }),
  http.get("/api/me/team/claims/:claimId", ({ request, params }) => {
    const c = teamClaim(request, String(params.claimId));
    return c ? HttpResponse.json(c) : err(404, "Claim not found");
  }),
  http.post("/api/me/team/claims/:claimId/approve", ({ request, params }) => {
    const c = teamClaim(request, String(params.claimId));
    if (!c) return err(404, "Claim not found");
    if (c.status !== "submitted") return err(409, "Claim is not awaiting a decision");
    const updated: Claim = { ...c, status: "approved", decidedAt: new Date().toISOString() };
    claims = claims.map((x) => (x.id === c.id ? updated : x));
    return HttpResponse.json(updated);
  }),
  http.post("/api/me/team/claims/:claimId/reject", async ({ request, params }) => {
    const c = teamClaim(request, String(params.claimId));
    if (!c) return err(404, "Claim not found");
    const body = (await request.json().catch(() => null)) as { reason?: string } | null;
    if (!body?.reason?.trim()) return err(400, "A reason is required");
    if (c.status !== "submitted") return err(409, "Claim is not awaiting a decision");
    const updated: Claim = { ...c, status: "rejected", decidedAt: new Date().toISOString(), rejectionReason: body.reason };
    claims = claims.map((x) => (x.id === c.id ? updated : x));
    return HttpResponse.json(updated);
  }),
  http.get("/api/me/team/claims/:claimId/expense-lines/:lineId/receipt", ({ request, params }) => {
    const c = teamClaim(request, String(params.claimId));
    return c ? receipt(c, String(params.lineId)) : err(404, "Claim not found");
  }),

  http.get("/api/employees", ({ request }) =>
    HttpResponse.json(page(people.map(asEmployee), new URL(request.url))),
  ),
  http.put("/api/employees/:employeeId/manager", async ({ request, params }) => {
    const target = people.find((p) => p.id === params.employeeId);
    if (!target) return err(404, "Employee not found");
    const body = (await request.json().catch(() => null)) as { managerId?: string } | null;
    const manager = people.find((p) => p.id === body?.managerId);
    if (!manager || manager.id === target.id) return err(400, "Invalid manager");
    people = people.map((p) => (p.id === target.id ? { ...p, managerId: manager.id } : p));
    return HttpResponse.json(asEmployee({ ...target, managerId: manager.id }));
  }),

  http.get("/api/export-candidates", ({ request }) => {
    const items = claims
      .filter((c) => c.status === "approved" && !c.exportBatchId)
      .map((c) => ({ id: c.id, reference: c.reference, employeeName: c.employeeName, totalCents: c.totalCents, approvedAt: c.decidedAt! }));
    return HttpResponse.json(page(items, new URL(request.url)));
  }),
  http.get("/api/exports", ({ request }) =>
    HttpResponse.json(page([...batches].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), new URL(request.url))),
  ),
  http.post("/api/exports", () => {
    const pending = claims.filter((c) => c.status === "approved" && !c.exportBatchId);
    if (pending.length === 0) return err(409, "Nothing to export");
    const id = `x${nextBatch++}`;
    const createdAt = new Date().toISOString();
    const batch: ExportBatch = {
      id, createdAt, claimCount: pending.length,
      totalCents: pending.reduce((s, c) => s + c.totalCents, 0),
      fileName: `payroll-${createdAt.slice(0, 10)}-${id}.csv`,
    };
    batches = [...batches, batch];
    const ids = new Set(pending.map((c) => c.id));
    claims = claims.map((c) => (ids.has(c.id) ? { ...c, status: "exported", exportBatchId: id } : c));
    return HttpResponse.json(batch, { status: 201 });
  }),
  http.get("/api/exports/:exportId/file", ({ params }) => {
    const b = batches.find((x) => x.id === params.exportId);
    if (!b) return err(404, "Export not found");
    const rows = claims
      .filter((c) => c.exportBatchId === b.id)
      .map((c) => `${c.employeeName},${c.reference},${c.decidedAt?.slice(0, 10) ?? ""},${(c.totalCents / 100).toFixed(2)}`);
    return new HttpResponse(["employee,claim reference,approval date,total", ...rows].join("\n"), {
      headers: { "Content-Type": "text/csv" },
    });
  }),
];
