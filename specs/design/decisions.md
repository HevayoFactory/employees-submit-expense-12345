# Technical decisions

- \[architecture\] One service holds claims, approvals, people and exports; one web app serves all three roles. *assumed* (all)
- \[data-model\] Amounts are stored in whole cents in one currency. *assumed* (all)
- \[data-model\] Receipt files are stored in the database, limited to 5 MB each. *assumed* (F1)
- \[data-model\] Expense categories are a fixed seeded list; there is no screen to change them. *assumed* (F1)
- \[data-model\] An employee record is created from the signed-in identity on first use, with no manager until Finance sets one. *assumed* (F1, F2)
- \[security\] A manager reads the team's claims through /me/team/claims, so reach follows the direct-report relation. *assumed* (F2)
- \[security\] Managers and employees both hold the own-claims handles; the three groups Employees, Managers and Finance are new. *assumed* (all)
- \[expense-api\] Lists return 20 items per page. *assumed* (all)
- \[expense-api\] An export is one database transaction that marks its claims exported, so a claim cannot appear in two batches. *assumed* (F3)