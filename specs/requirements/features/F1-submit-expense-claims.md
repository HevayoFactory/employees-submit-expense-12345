# Submit expense claims

## Purpose

Employees create and submit expense claims and follow their status.

## User Stories

- F1.1 As an employee, I create a claim made of one or more expense lines, each with a date, amount, category and note.
- F1.2 As an employee, I attach a receipt to an expense line.
- F1.3 As an employee, I save a claim as a draft and edit it until I submit it.
- F1.4 As an employee, I submit a draft claim for approval.
- F1.5 As an employee, I see my claims and each one's status (draft, submitted, approved, rejected, exported).
- F1.6 As an employee, I see the reason a claim was rejected. Needs: F2.
- F1.7 As an employee, I edit a rejected claim and resubmit it. Needs: F2.
- F1.8 As an employee, I see the total of a claim, calculated from its lines.

## Decisions

- A claim holds several expense lines; its total is the sum of its lines.
- Receipts are an optional attachment on each expense line, never required.
- A rejected claim is edited and resubmitted as the same claim, not recreated.
- Employees type in expense details themselves; no agent reads receipts.
- A submitted claim cannot be edited by the employee until it is rejected.
- An employee sees only their own claims.
- Expense categories are a fixed list maintained by the product team, not chosen freely by employees.

## Out of Scope

- Automatic reading of receipts by an agent.