import ballerina/sql;
import ballerina/time;
import ballerina/uuid;
import ballerinax/postgresql;

type PendingRow record {|
    string id;
    string reference;
    @sql:Column {name: "employee_name"}
    string employeeName;
    @sql:Column {name: "total_cents"}
    int totalCents;
    @sql:Column {name: "approved_at"}
    string approvedAt;
    @sql:Column {name: "approved_on"}
    string approvedOn;
|};

type BatchRow record {|
    string id;
    @sql:Column {name: "created_at"}
    string createdAt;
    @sql:Column {name: "claim_count"}
    int claimCount;
    @sql:Column {name: "total_cents"}
    int totalCents;
    @sql:Column {name: "file_name"}
    string fileName;
|};

// The approved claims that no batch holds yet, oldest approval first.
function listExportCandidates(PageParams page) returns PendingClaimPage|error {
    postgresql:Client dbClient = check database();
    CountRow counted = check dbClient->queryRow(`
        SELECT count(*)::bigint AS total FROM claims
        WHERE status = 'approved' AND export_batch_id IS NULL`);
    stream<PendingRow, sql:Error?> rows = dbClient->query(`
        SELECT c.id, c.reference, e.name AS employee_name, c.total_cents,
            to_char(c.decided_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS approved_at,
            to_char(c.decided_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS approved_on
        FROM claims c JOIN employees e ON e.id = c.employee_id
        WHERE c.status = 'approved' AND c.export_batch_id IS NULL
        ORDER BY c.decided_at ASC, c.reference
        LIMIT ${page.'limit} OFFSET ${page.offset}`);
    PendingClaim[] data = check from PendingRow row in rows
        select {
            id: row.id,
            reference: row.reference,
            employeeName: row.employeeName,
            totalCents: row.totalCents,
            approvedAt: row.approvedAt
        };
    [string?, string?] [next, previous] = pageLinks("/export-candidates", "", page, counted.total);
    return {count: counted.total, next, previous, data};
}

function toBatch(BatchRow row) returns ExportBatch => {
    id: row.id,
    createdAt: row.createdAt,
    claimCount: row.claimCount,
    totalCents: row.totalCents,
    fileName: row.fileName
};

function loadBatch(postgresql:Client dbClient, string batchId) returns ExportBatch|error {
    BatchRow row = check dbClient->queryRow(`
        SELECT id, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
            claim_count, total_cents, file_name
        FROM export_batches WHERE id = ${batchId}`);
    return toBatch(row);
}

// Past exports, newest first.
function listExportBatches(PageParams page) returns ExportBatchPage|error {
    postgresql:Client dbClient = check database();
    CountRow counted = check dbClient->queryRow(`SELECT count(*)::bigint AS total FROM export_batches`);
    stream<BatchRow, sql:Error?> rows = dbClient->query(`
        SELECT id, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
            claim_count, total_cents, file_name
        FROM export_batches
        ORDER BY export_batches.created_at DESC, id
        LIMIT ${page.'limit} OFFSET ${page.offset}`);
    ExportBatch[] data = check from BatchRow row in rows
        select toBatch(row);
    [string?, string?] [next, previous] = pageLinks("/exports", "", page, counted.total);
    return {count: counted.total, next, previous, data};
}

function createExportBody(postgresql:Client dbClient, GatewayCaller caller) returns ExportBatch|ClaimFailure|error {
    // The row locks keep a concurrent export from taking the same claims: it waits,
    // then sees them exported and finds nothing left.
    stream<PendingRow, sql:Error?> rows = dbClient->query(`
        SELECT c.id, c.reference, e.name AS employee_name, c.total_cents,
            to_char(c.decided_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS approved_at,
            to_char(c.decided_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS approved_on
        FROM claims c JOIN employees e ON e.id = c.employee_id
        WHERE c.status = 'approved' AND c.export_batch_id IS NULL
        ORDER BY c.decided_at ASC, c.reference
        FOR UPDATE OF c`);
    PendingRow[] pending = check from PendingRow row in rows
        select row;
    if pending.length() == 0 {
        return failure("conflict", "there are no approved claims waiting to be exported");
    }
    int total = 0;
    ExportRow[] fileRows = [];
    foreach PendingRow row in pending {
        total += row.totalCents;
        fileRows.push({
            employeeName: row.employeeName,
            reference: row.reference,
            approvedOn: row.approvedOn,
            totalCents: row.totalCents
        });
    }
    string batchId = uuid:createType4AsString();
    time:Civil now = time:utcToCivil(time:utcNow());
    string fileName = exportFileName(now.year, now.month, now.day, batchId);
    sql:ExecutionResult _ = check dbClient->execute(`
        INSERT INTO export_batches (id, created_by, claim_count, total_cents, file_name, csv_content)
        VALUES (${batchId}, ${caller.userId}, ${pending.length()}, ${total}, ${fileName},
            ${renderExportCsv(fileRows)})`);
    foreach PendingRow row in pending {
        sql:ExecutionResult _ = check dbClient->execute(`
            UPDATE claims SET status = 'exported', export_batch_id = ${batchId},
                updated_at = now(), updated_by = ${caller.userId}
            WHERE id = ${row.id}`);
        check recordAudit(dbClient, "claim", row.id, "exported", caller.userId, "batch " + batchId);
    }
    check recordAudit(dbClient, "export", batchId, "created", caller.userId,
        pending.length().toString() + " claims");
    return loadBatch(dbClient, batchId);
}

// Exports every approved, not yet exported claim as one batch, in one transaction.
// A conflict when nothing is waiting; no batch is created then.
function createExportFor(GatewayCaller caller) returns ExportBatch|ClaimFailure|error {
    Employee _ = check ensureEmployee(caller);
    postgresql:Client dbClient = check database();
    transaction {
        ExportBatch batch = check createExportBody(dbClient, caller);
        check commit;
        return batch;
    } on fail error cause {
        return cause;
    }
}

function readExportFile(string exportId) returns [string, string]|ClaimFailure|error {
    postgresql:Client dbClient = check database();
    record {|
        @sql:Column {name: "csv_content"}
        string csvContent;
        @sql:Column {name: "file_name"}
        string fileName;
    |}|sql:Error row = dbClient->queryRow(`
        SELECT csv_content, file_name FROM export_batches WHERE id = ${exportId}`);
    if row is sql:NoRowsError {
        return failure("notFound", "export not found");
    }
    if row is sql:Error {
        return row;
    }
    return [row.csvContent, row.fileName];
}

// ---- people ----

function listAllEmployees(PageParams page) returns EmployeePage|error {
    postgresql:Client dbClient = check database();
    CountRow counted = check dbClient->queryRow(`SELECT count(*)::bigint AS total FROM employees`);
    stream<EmployeeRow, sql:Error?> rows = dbClient->query(`
        SELECT e.id, e.name, e.email, e.manager_id, m.name AS manager_name
        FROM employees e LEFT JOIN employees m ON m.id = e.manager_id
        ORDER BY e.name, e.id
        LIMIT ${page.'limit} OFFSET ${page.offset}`);
    Employee[] data = check from EmployeeRow row in rows
        select toEmployee(row);
    [string?, string?] [next, previous] = pageLinks("/employees", "", page, counted.total);
    return {count: counted.total, next, previous, data};
}

function employeeExists(postgresql:Client dbClient, string employeeId) returns boolean|error {
    CountRow counted = check dbClient->queryRow(`
        SELECT count(*)::bigint AS total FROM employees WHERE id = ${employeeId}`);
    return counted.total > 0;
}

function setManagerBody(postgresql:Client dbClient, GatewayCaller caller, string employeeId, string managerId)
        returns Employee|ClaimFailure|error {
    // Lock the employee so concurrent changes to one line manager serialise.
    CountRow locked = check dbClient->queryRow(`
        SELECT count(*)::bigint AS total FROM (
            SELECT id FROM employees WHERE id = ${employeeId} FOR UPDATE) AS found`);
    if locked.total == 0 {
        return failure("notFound", "employee not found");
    }
    if !check employeeExists(dbClient, managerId) {
        return failure("badRequest", "the line manager is not a known employee");
    }
    sql:ExecutionResult _ = check dbClient->execute(`
        UPDATE employees SET manager_id = ${managerId}, updated_at = now(), updated_by = ${caller.userId}
        WHERE id = ${employeeId}`);
    check recordAudit(dbClient, "employee", employeeId, "manager-set", caller.userId, "manager " + managerId);
    EmployeeRow row = check dbClient->queryRow(`
        SELECT e.id, e.name, e.email, e.manager_id, m.name AS manager_name
        FROM employees e LEFT JOIN employees m ON m.id = e.manager_id
        WHERE e.id = ${employeeId}`);
    return toEmployee(row);
}

function setEmployeeManagerFor(GatewayCaller caller, string employeeId, ManagerAssignment input)
        returns Employee|ClaimFailure|error {
    string|ClaimFailure managerId = validateManagerAssignment(employeeId, input.managerId);
    if managerId is ClaimFailure {
        return managerId;
    }
    postgresql:Client dbClient = check database();
    transaction {
        Employee updated = check setManagerBody(dbClient, caller, employeeId, managerId);
        check commit;
        return updated;
    } on fail error cause {
        return cause;
    }
}
