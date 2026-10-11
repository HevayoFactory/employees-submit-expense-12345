import ballerina/lang.array;
import ballerina/sql;
import ballerina/uuid;
import ballerinax/postgresql;

type ClaimRow record {|
    string id;
    string reference;
    @sql:Column {name: "employee_id"}
    string employeeId;
    @sql:Column {name: "employee_name"}
    string employeeName;
    string status;
    @sql:Column {name: "total_cents"}
    int totalCents;
    @sql:Column {name: "submitted_at"}
    string? submittedAt;
    @sql:Column {name: "decided_at"}
    string? decidedAt;
    @sql:Column {name: "rejection_reason"}
    string? rejectionReason;
    @sql:Column {name: "export_batch_id"}
    string? exportBatchId;
|};

type LineRow record {|
    string id;
    @sql:Column {name: "line_date"}
    string lineDate;
    @sql:Column {name: "amount_cents"}
    int amountCents;
    @sql:Column {name: "category_id"}
    string categoryId;
    string? note;
    @sql:Column {name: "category_name"}
    string categoryName;
    @sql:Column {name: "receipt_file_name"}
    string? receiptFileName;
|};

type SummaryRow record {|
    string id;
    string reference;
    @sql:Column {name: "employee_name"}
    string employeeName;
    string status;
    @sql:Column {name: "total_cents"}
    int totalCents;
    @sql:Column {name: "submitted_at"}
    string? submittedAt;
    @sql:Column {name: "decided_at"}
    string? decidedAt;
|};

type CountRow record {|
    int total;
|};

type StateRow record {|
    string status;
|};

type ReceiptRow record {|
    @sql:Column {name: "file_name"}
    string fileName;
    @sql:Column {name: "content_type"}
    string contentType;
    byte[] content;
|};

type IdRow record {|
    string id;
|};

// The claim with its lines, only when it belongs to `employeeId`.
function loadClaim(postgresql:Client dbClient, string claimId, string employeeId) returns Claim|ClaimFailure|error {
    ClaimRow|sql:Error found = dbClient->queryRow(`
        SELECT c.id, c.reference, c.employee_id, e.name AS employee_name, c.status, c.total_cents,
            to_char(c.submitted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS submitted_at,
            to_char(c.decided_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS decided_at,
            c.rejection_reason, c.export_batch_id
        FROM claims c JOIN employees e ON e.id = c.employee_id
        WHERE c.id = ${claimId} AND c.employee_id = ${employeeId}`);
    if found is sql:NoRowsError {
        return failure("notFound", "claim not found");
    }
    if found is sql:Error {
        return found;
    }
    ClaimStatus status = check parseStatus(found.status);
    stream<LineRow, sql:Error?> lineRows = dbClient->query(`
        SELECT l.id, to_char(l.line_date, 'YYYY-MM-DD') AS line_date, l.amount_cents, l.category_id,
            l.note, k.name AS category_name, r.file_name AS receipt_file_name
        FROM expense_lines l
            JOIN categories k ON k.id = l.category_id
            LEFT JOIN receipts r ON r.expense_line_id = l.id
        WHERE l.claim_id = ${claimId}
        ORDER BY l.position`);
    ExpenseLine[] lines = check from LineRow row in lineRows
        select {
            id: row.id,
            date: row.lineDate,
            amountCents: row.amountCents,
            categoryId: row.categoryId,
            note: row.note,
            categoryName: row.categoryName,
            receiptFileName: row.receiptFileName
        };
    return {
        id: found.id,
        reference: found.reference,
        employeeId: found.employeeId,
        employeeName: found.employeeName,
        status,
        totalCents: found.totalCents,
        submittedAt: found.submittedAt,
        decidedAt: found.decidedAt,
        rejectionReason: found.rejectionReason,
        exportBatchId: found.exportBatchId,
        lines
    };
}

// A page of the caller's claims, newest activity first.
function listClaims(string employeeId, ClaimStatus? status, PageParams page, string path)
        returns ClaimSummaryPage|error {
    postgresql:Client dbClient = check database();
    string? statusText = status;
    CountRow counted = check dbClient->queryRow(`
        SELECT count(*)::bigint AS total FROM claims
        WHERE employee_id = ${employeeId} AND (${statusText}::text IS NULL OR status = ${statusText}::text)`);
    stream<SummaryRow, sql:Error?> rows = dbClient->query(`
        SELECT c.id, c.reference, e.name AS employee_name, c.status, c.total_cents,
            to_char(c.submitted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS submitted_at,
            to_char(c.decided_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS decided_at
        FROM claims c JOIN employees e ON e.id = c.employee_id
        WHERE c.employee_id = ${employeeId} AND (${statusText}::text IS NULL OR c.status = ${statusText}::text)
        ORDER BY COALESCE(c.submitted_at, c.created_at) DESC, c.id
        LIMIT ${page.'limit} OFFSET ${page.offset}`);
    ClaimSummary[] data = check from SummaryRow row in rows
        select {
            id: row.id,
            reference: row.reference,
            employeeName: row.employeeName,
            status: check parseStatus(row.status),
            totalCents: row.totalCents,
            submittedAt: row.submittedAt,
            decidedAt: row.decidedAt
        };
    string extra = status is () ? "" : "status=" + status;
    [string?, string?] [next, previous] = pageLinks(path, extra, page, counted.total);
    return {count: counted.total, next, previous, data};
}

function knownCategoryIds(postgresql:Client dbClient) returns string[]|error {
    stream<IdRow, sql:Error?> rows = dbClient->query(`SELECT id FROM categories`);
    return from IdRow row in rows
        select row.id;
}

function insertLines(postgresql:Client dbClient, string claimId, ExpenseLineInput[] lines, string actorId)
        returns error? {
    int position = 0;
    foreach ExpenseLineInput line in lines {
        position += 1;
        string lineId = uuid:createType4AsString();
        string? note = line?.note;
        sql:ExecutionResult _ = check dbClient->execute(`
            INSERT INTO expense_lines
                (id, claim_id, position, line_date, amount_cents, category_id, note, created_by, updated_by)
            VALUES (${lineId}, ${claimId}, ${position}, ${line.date}::date, ${line.amountCents},
                ${line.categoryId}, ${note}, ${actorId}, ${actorId})`);
    }
}

function createClaimBody(postgresql:Client dbClient, GatewayCaller caller, ClaimInput input)
        returns Claim|ClaimFailure|error {
    string? unknown = unknownCategory(input.lines, check knownCategoryIds(dbClient));
    if unknown is string {
        return failure("badRequest", unknown);
    }
    string claimId = uuid:createType4AsString();
    sql:ExecutionResult _ = check dbClient->execute(`
        INSERT INTO claims (id, employee_id, status, total_cents, created_by, updated_by)
        VALUES (${claimId}, ${caller.userId}, 'draft', ${totalCents(input.lines)}, ${caller.userId}, ${caller.userId})`);
    check insertLines(dbClient, claimId, input.lines, caller.userId);
    check recordAudit(dbClient, "claim", claimId, "created", caller.userId);
    return loadClaim(dbClient, claimId, caller.userId);
}

// Creates a draft claim for the caller. The owner is the assertion's sub.
function createMyClaimFor(GatewayCaller caller, ClaimInput input) returns Claim|ClaimFailure|error {
    string? invalid = validateClaimInput(input);
    if invalid is string {
        return failure("badRequest", invalid);
    }
    Employee _ = check ensureEmployee(caller);
    postgresql:Client dbClient = check database();
    transaction {
        Claim created = check createClaimBody(dbClient, caller, input);
        check commit;
        return created;
    } on fail error cause {
        return cause;
    }
}

// Locks the caller's claim row and returns its status; notFound if it is not theirs.
function lockClaimState(postgresql:Client dbClient, string claimId, string employeeId)
        returns ClaimStatus|ClaimFailure|error {
    StateRow|sql:Error state = dbClient->queryRow(`
        SELECT status FROM claims WHERE id = ${claimId} AND employee_id = ${employeeId} FOR UPDATE`);
    if state is sql:NoRowsError {
        return failure("notFound", "claim not found");
    }
    if state is sql:Error {
        return state;
    }
    return parseStatus(state.status);
}

function updateClaimBody(postgresql:Client dbClient, GatewayCaller caller, string claimId, ClaimInput input)
        returns Claim|ClaimFailure|error {
    ClaimStatus status = check lockClaimState(dbClient, claimId, caller.userId);
    if !canEdit(status) {
        return failure("conflict", "a claim that is " + status + " cannot be edited");
    }
    string? unknown = unknownCategory(input.lines, check knownCategoryIds(dbClient));
    if unknown is string {
        return failure("badRequest", unknown);
    }
    sql:ExecutionResult _ = check dbClient->execute(`DELETE FROM expense_lines WHERE claim_id = ${claimId}`);
    check insertLines(dbClient, claimId, input.lines, caller.userId);
    sql:ExecutionResult _ = check dbClient->execute(`
        UPDATE claims SET total_cents = ${totalCents(input.lines)}, updated_at = now(), updated_by = ${caller.userId}
        WHERE id = ${claimId}`);
    check recordAudit(dbClient, "claim", claimId, "updated", caller.userId);
    return loadClaim(dbClient, claimId, caller.userId);
}

// Replaces the lines of the caller's draft or rejected claim.
function updateMyClaimFor(GatewayCaller caller, string claimId, ClaimInput input)
        returns Claim|ClaimFailure|error {
    string? invalid = validateClaimInput(input);
    if invalid is string {
        return failure("badRequest", invalid);
    }
    postgresql:Client dbClient = check database();
    transaction {
        Claim updated = check updateClaimBody(dbClient, caller, claimId, input);
        check commit;
        return updated;
    } on fail error cause {
        return cause;
    }
}

function submitClaimBody(postgresql:Client dbClient, GatewayCaller caller, string claimId)
        returns Claim|ClaimFailure|error {
    ClaimStatus status = check lockClaimState(dbClient, claimId, caller.userId);
    ClaimStatus? next = statusAfterSubmit(status);
    if next is () {
        return failure("conflict", "a claim that is " + status + " cannot be submitted");
    }
    // Same claim and reference; a resubmission clears the earlier decision.
    sql:ExecutionResult _ = check dbClient->execute(`
        UPDATE claims SET status = ${next}, submitted_at = now(), decided_at = NULL, decided_by = NULL,
            rejection_reason = NULL, updated_at = now(), updated_by = ${caller.userId}
        WHERE id = ${claimId}`);
    check recordAudit(dbClient, "claim", claimId, "submitted", caller.userId,
        status == "rejected" ? "resubmitted after rejection" : ());
    return loadClaim(dbClient, claimId, caller.userId);
}

// Submits the caller's draft or rejected claim; who and when go to the audit log.
function submitMyClaimFor(GatewayCaller caller, string claimId) returns Claim|ClaimFailure|error {
    postgresql:Client dbClient = check database();
    transaction {
        Claim submitted = check submitClaimBody(dbClient, caller, claimId);
        check commit;
        return submitted;
    } on fail error cause {
        return cause;
    }
}

function attachReceiptBody(postgresql:Client dbClient, GatewayCaller caller, string claimId, string lineId,
        DecodedReceipt receipt) returns ()|ClaimFailure|error {
    ClaimStatus status = check lockClaimState(dbClient, claimId, caller.userId);
    IdRow|sql:Error line = dbClient->queryRow(`
        SELECT id FROM expense_lines WHERE id = ${lineId} AND claim_id = ${claimId}`);
    if line is sql:NoRowsError {
        return failure("notFound", "expense line not found");
    }
    if line is sql:Error {
        return line;
    }
    if !canEdit(status) {
        return failure("conflict", "a claim that is " + status + " cannot be edited");
    }
    string receiptId = uuid:createType4AsString();
    sql:ExecutionResult _ = check dbClient->execute(`
        INSERT INTO receipts (id, expense_line_id, file_name, content_type, content, created_by)
        VALUES (${receiptId}, ${lineId}, ${receipt.fileName}, ${receipt.contentType}, ${receipt.content},
            ${caller.userId})
        ON CONFLICT (expense_line_id) DO UPDATE
        SET file_name = EXCLUDED.file_name, content_type = EXCLUDED.content_type, content = EXCLUDED.content`);
    check recordAudit(dbClient, "claim", claimId, "receipt-attached", caller.userId, "line " + lineId);
}

// Stores (or replaces) the receipt of a line of the caller's draft or rejected claim.
function attachMyReceiptFor(GatewayCaller caller, string claimId, string lineId, Receipt input)
        returns ()|ClaimFailure|error {
    DecodedReceipt|ClaimFailure decoded = decodeReceipt(input);
    if decoded is ClaimFailure {
        return decoded;
    }
    postgresql:Client dbClient = check database();
    transaction {
        () attached = check attachReceiptBody(dbClient, caller, claimId, lineId, decoded);
        check commit;
        return ();
    } on fail error cause {
        return cause;
    }
}

function getMyReceiptFor(GatewayCaller caller, string claimId, string lineId) returns Receipt|ClaimFailure|error {
    postgresql:Client dbClient = check database();
    ReceiptRow|sql:Error row = dbClient->queryRow(`
        SELECT r.file_name, r.content_type, r.content
        FROM receipts r
            JOIN expense_lines l ON l.id = r.expense_line_id
            JOIN claims c ON c.id = l.claim_id
        WHERE l.id = ${lineId} AND c.id = ${claimId} AND c.employee_id = ${caller.userId}`);
    if row is sql:NoRowsError {
        return failure("notFound", "receipt not found");
    }
    if row is sql:Error {
        return row;
    }
    return {fileName: row.fileName, contentType: row.contentType, contentBase64: array:toBase64(row.content)};
}

function readMyClaim(GatewayCaller caller, string claimId) returns Claim|ClaimFailure|error {
    postgresql:Client dbClient = check database();
    return loadClaim(dbClient, claimId, caller.userId);
}
