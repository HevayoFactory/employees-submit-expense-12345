# Approvals

## Purpose

Managers review submitted claims and approve or reject them.

Needs: F1.

## User Stories

- F2.1 As a manager, I see the submitted claims of the employees I manage in one list, oldest first.
- F2.2 As a manager, I open a claim and see its expense lines, receipts and total.
- F2.3 As a manager, I approve a claim.
- F2.4 As a manager, I reject a claim with a required reason.
- F2.5 As a manager, I see the claims I have already decided.

## Decisions

- A claim is decided by the employee's line manager; other managers do not see it.
- A rejection requires a reason, which the employee sees.
- The manager's decision is final; no further approval step, whatever the amount.
- A manager approves or rejects a whole claim, not individual lines.
- No notifications: managers and employees check the app for pending and decided claims.
- A manager cannot approve their own claim.
- Finance sets each employee's line manager on a People screen; an employee with no manager has no one to decide their claims. *assumed*
- A manager's own claims are decided by the manager's own line manager. *assumed*

## Out of Scope

- Approval chains or extra approval by Finance for large claims.
- Email or other notifications.