import ballerina/lang.array;
import ballerina/sql;
import ballerinax/postgresql;

type TeamOwnerRow record {|
    @sql:Column {name: "employee_id"}
    string employeeId;
    string status;
|};

// Locks the claim when its owner reports directly to `managerId`, it is not
// the manager's own and it is not a draft. Anything else is notFound.
function lockTeamClaim(postgresql:Client dbClient, string claimId, string managerId)
        returns TeamOwnerRow|ClaimFailure|error {
    TeamOwnerRow|sql:Error found = dbClient->queryRow(`
        SELECT c.employee_id, c.status
        FROM claims c JOIN employees e ON e.id = c.employee_id
        WHERE c.id = ${claimId} AND e.manager_id = ${managerId}
            AND c.employee_id <> ${managerId} AND c.status <> 'draft'
        FOR UPDATE OF c`);
    if found is sql:NoRowsError {
        return failure("notFound", "claim not found");
    }
    if found is sql:Error {
        return found;
    }
    return found;
}

// A page of the direct reports' claims, oldest submission first. Never drafts, never the caller's own.
function listTeamClaims(string managerId, ClaimStatus? status, PageParams page, string path)
        returns ClaimSummaryPage|error {
    if !listableTeamStatus(status) {
        return {count: 0, data: []};
    }
    postgresql:Client dbClient = check database();
    string? statusText = status;
    CountRow counted = check dbClient->queryRow(`
        SELECT count(*)::bigint AS total
        FROM claims c JOIN employees e ON e.id = c.employee_id
        WHERE e.manager_id = ${managerId} AND c.employee_id <> ${managerId} AND c.status <> 'draft'
            AND (${statusText}::text IS NULL OR c.status = ${statusText}::text)`);
    stream<SummaryRow, sql:Error?> rows = dbClient->query(`
        SELECT c.id, c.reference, e.name AS employee_name, c.status, c.total_cents,
            to_char(c.submitted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS submitted_at,
            to_char(c.decided_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS decided_at
        FROM claims c JOIN employees e ON e.id = c.employee_id
        WHERE e.manager_id = ${managerId} AND c.employee_id <> ${managerId} AND c.status <> 'draft'
            AND (${statusText}::text IS NULL OR c.status = ${statusText}::text)
        ORDER BY c.submitted_at ASC NULLS LAST, c.id
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

function readTeamClaim(GatewayCaller caller, string claimId) returns Claim|ClaimFailure|error {
    postgresql:Client dbClient = check database();
    TeamOwnerRow|sql:Error found = dbClient->queryRow(`
        SELECT c.employee_id, c.status
        FROM claims c JOIN employees e ON e.id = c.employee_id
        WHERE c.id = ${claimId} AND e.manager_id = ${caller.userId}
            AND c.employee_id <> ${caller.userId} AND c.status <> 'draft'`);
    if found is sql:NoRowsError {
        return failure("notFound", "claim not found");
    }
    if found is sql:Error {
        return found;
    }
    return loadClaim(dbClient, claimId, found.employeeId);
}

function getTeamReceiptFor(GatewayCaller caller, string claimId, string lineId) returns Receipt|ClaimFailure|error {
    postgresql:Client dbClient = check database();
    ReceiptRow|sql:Error row = dbClient->queryRow(`
        SELECT r.file_name, r.content_type, r.content
        FROM receipts r
            JOIN expense_lines l ON l.id = r.expense_line_id
            JOIN claims c ON c.id = l.claim_id
            JOIN employees e ON e.id = c.employee_id
        WHERE l.id = ${lineId} AND c.id = ${claimId} AND e.manager_id = ${caller.userId}
            AND c.employee_id <> ${caller.userId} AND c.status <> 'draft'`);
    if row is sql:NoRowsError {
        return failure("notFound", "receipt not found");
    }
    if row is sql:Error {
        return row;
    }
    return {fileName: row.fileName, contentType: row.contentType, contentBase64: array:toBase64(row.content)};
}

function decideClaimBody(postgresql:Client dbClient, GatewayCaller caller, string claimId, boolean approve,
        string? reason) returns Claim|ClaimFailure|error {
    TeamOwnerRow owner = check lockTeamClaim(dbClient, claimId, caller.userId);
    ClaimStatus status = check parseStatus(owner.status);
    ClaimStatus? next = statusAfterDecision(status, approve);
    if next is () {
        return failure("conflict", "a claim that is " + status + " cannot be decided");
    }
    // Who decided and when: decided_by/decided_at on the row, and the audit log.
    sql:ExecutionResult _ = check dbClient->execute(`
        UPDATE claims SET status = ${next}, decided_at = now(), decided_by = ${caller.userId},
            rejection_reason = ${reason}, updated_at = now(), updated_by = ${caller.userId}
        WHERE id = ${claimId}`);
    check recordAudit(dbClient, "claim", claimId, approve ? "approved" : "rejected", caller.userId, reason);
    return loadClaim(dbClient, claimId, owner.employeeId);
}

// The manager's decision on a direct report's submitted claim. A decision needs the manager's own employee row (decided_by).
function decideTeamClaim(GatewayCaller caller, string claimId, boolean approve, string? reason)
        returns Claim|ClaimFailure|error {
    Employee _ = check ensureEmployee(caller);
    postgresql:Client dbClient = check database();
    transaction {
        Claim decided = check decideClaimBody(dbClient, caller, claimId, approve, reason);
        check commit;
        return decided;
    } on fail error cause {
        return cause;
    }
}

function approveTeamClaimFor(GatewayCaller caller, string claimId) returns Claim|ClaimFailure|error {
    return decideTeamClaim(caller, claimId, true, ());
}

function rejectTeamClaimFor(GatewayCaller caller, string claimId, Rejection input) returns Claim|ClaimFailure|error {
    string|ClaimFailure reason = validateRejection(input.reason);
    if reason is ClaimFailure {
        return reason;
    }
    return decideTeamClaim(caller, claimId, false, reason);
}
