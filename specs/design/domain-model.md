# Domain model

Employees file claims made of expense lines; the employee's line manager decides each claim; Finance exports approved claims in batches.

```mermaid
erDiagram
    EMPLOYEE ||--o{ CLAIM : files
    EMPLOYEE ||--o{ EMPLOYEE : manages
    CLAIM ||--|{ EXPENSE_LINE : contains
    EXPENSE_LINE ||--o| RECEIPT : has
    CATEGORY ||--o{ EXPENSE_LINE : classifies
    EXPORT_BATCH ||--o{ CLAIM : includes

    EMPLOYEE {
        string id
        string name
        string email
        string managerId
    }
    CLAIM {
        string id
        string reference
        string employeeId
        string status
        string rejectionReason
        int totalCents
        string submittedAt
        string decidedAt
        string decidedById
        string exportBatchId
    }
    EXPENSE_LINE {
        string id
        string claimId
        string date
        int amountCents
        string categoryId
        string note
    }
    RECEIPT {
        string id
        string expenseLineId
        string fileName
        string contentType
    }
    CATEGORY {
        string id
        string name
    }
    EXPORT_BATCH {
        string id
        string createdAt
        string createdById
        int claimCount
        int totalCents
    }
```

Claim status is one of draft, submitted, approved, rejected, exported. Employee records are created from the signed-in identity on first use; Finance sets `managerId`. Categories are a fixed seeded list.