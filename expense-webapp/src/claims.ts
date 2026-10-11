import { expenseApi } from "./api";
import type { components } from "./generated/expense-api";

export type Claim = components["schemas"]["Claim"];
export type ClaimStatus = components["schemas"]["ClaimStatus"];
export type ExpenseLine = components["schemas"]["ExpenseLine"];
export type LineInput = components["schemas"]["ExpenseLineInput"];
export type Receipt = components["schemas"]["Receipt"];

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

/** Amounts travel as cents; display as dollars, as the prototype does. */
export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function dateOnly(iso: string | null | undefined, none = "Not submitted"): string {
  return iso ? iso.slice(0, 10) : none;
}

export const STATUS_LABEL: Record<ClaimStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  exported: "Exported",
};

export function statusColor(status: ClaimStatus): "default" | "info" | "success" | "warning" | "error" {
  if (status === "approved") return "success";
  if (status === "rejected") return "error";
  if (status === "submitted") return "warning";
  if (status === "exported") return "info";
  return "default";
}

export const isEditable = (c: Pick<Claim, "status">): boolean => c.status === "draft" || c.status === "rejected";

/** "42.50" -> 4250, or null when it is not an amount with at most two decimals. */
export function toCents(text: string): number | null {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || 0);
  return cents >= 1 ? cents : null;
}

/** The message of the API's error body, or a fallback. */
export function apiMessage(error: unknown, fallback: string): string {
  const e = error as { message?: string; description?: string } | undefined;
  return e?.description || e?.message || fallback;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Reads a picked file as a Receipt body. The caller has checked the size. */
export async function fileToReceipt(file: File): Promise<Receipt> {
  return {
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    contentBase64: toBase64(await file.arrayBuffer()),
  };
}

export async function loadClaim(claimId: string): Promise<Claim> {
  const { data, error } = await expenseApi.GET("/me/claims/{claimId}", { params: { path: { claimId } } });
  if (!data) throw new Error(apiMessage(error, "The claim could not be loaded."));
  return data;
}

export const toInput = (l: ExpenseLine): LineInput => ({
  date: l.date,
  amountCents: l.amountCents,
  categoryId: l.categoryId,
  ...(l.note ? { note: l.note } : {}),
});

export interface LineChange {
  input: LineInput;
  /** An existing line whose receipt is kept (a replace issues new line ids). */
  keepReceiptOf?: string;
  /** A newly picked receipt. */
  receipt?: Receipt;
}

export interface SaveResult {
  claim: Claim;
  /** Set when the lines were saved but a receipt was not. */
  receiptError?: string;
}

/**
 * Saves the claim's lines. `claimId` null creates a draft. A replace gives every
 * line a new id, so receipts to keep are read first and attached again after.
 */
export async function saveLines(claimId: string | null, changes: LineChange[]): Promise<SaveResult> {
  const receipts: (Receipt | undefined)[] = [];
  for (const c of changes) {
    if (c.receipt) {
      receipts.push(c.receipt);
    } else if (claimId && c.keepReceiptOf) {
      const { data, error } = await expenseApi.GET("/me/claims/{claimId}/expense-lines/{lineId}/receipt", {
        params: { path: { claimId, lineId: c.keepReceiptOf } },
      });
      if (!data) throw new Error(apiMessage(error, "An existing receipt could not be read."));
      receipts.push(data);
    } else {
      receipts.push(undefined);
    }
  }
  const body = { lines: changes.map((c) => c.input) };
  const saved = claimId
    ? await expenseApi.PUT("/me/claims/{claimId}", { params: { path: { claimId } }, body })
    : await expenseApi.POST("/me/claims", { body });
  if (!saved.data) throw new Error(apiMessage(saved.error, "The claim could not be saved."));
  const claim = saved.data;
  let receiptError: string | undefined;
  for (let i = 0; i < receipts.length; i++) {
    const r = receipts[i];
    const line = claim.lines[i];
    if (!r || !line) continue;
    const res = await expenseApi.PUT("/me/claims/{claimId}/expense-lines/{lineId}/receipt", {
      params: { path: { claimId: claim.id, lineId: line.id } },
      body: r,
    });
    if (res.error) receiptError = apiMessage(res.error, "The receipt could not be stored.");
  }
  return { claim: receiptError ? await loadClaim(claim.id) : claim, receiptError };
}

export async function submitClaim(claimId: string): Promise<Claim> {
  const { data, error } = await expenseApi.POST("/me/claims/{claimId}/submit", { params: { path: { claimId } } });
  if (!data) throw new Error(apiMessage(error, "The claim could not be submitted."));
  return data;
}
