# Payroll export

## Purpose

Finance exports approved claims to payroll as a downloadable file.

Needs: F2.

## User Stories

- F3.1 As a finance user, I see the approved claims that have not been exported yet, with employee, total and approval date.
- F3.2 As a finance user, I export all approved, not yet exported claims in one batch as a downloadable CSV file.
- F3.3 As a finance user, I see the claims in an export marked as exported afterwards.
- F3.4 As a finance user, I see a history of past exports and download an earlier file again.

## Decisions

- The export file is CSV.
- Each export contains every approved claim not yet exported; Finance does not pick individual claims.
- An exported claim is marked exported and is never included in a later export.
- Past export files are kept so they can be downloaded again.
- The CSV has one row per claim: employee, claim reference, approval date and total.
- An export with no approved claims waiting is not created; Finance is told there is nothing to export.

## Out of Scope

- Direct posting to a payroll system.
- Re-exporting a claim in a new batch.
- Exporting a chosen subset or date range of claims.