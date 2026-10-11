// Pure export and people rules: CSV rendering and validation. No database.

// One line of an export file.
type ExportRow record {|
    string employeeName;
    string reference;
    // YYYY-MM-DD
    string approvedOn;
    int totalCents;
|};

const string CSV_HEADER = "employee,claim reference,approval date,total";
const string CSV_EOL = "\r\n";

// Characters that make a spreadsheet read a cell as a formula.
const string FORMULA_LEADERS = "=+-@\t\r";

// One CSV field: a leading formula character is neutralised with an apostrophe,
// and a field with a comma, quote or line break is quoted with quotes doubled.
function csvCell(string value) returns string {
    string text = value;
    if text.length() > 0 && FORMULA_LEADERS.includes(text.substring(0, 1)) {
        text = "'" + text;
    }
    boolean needsQuotes = text.includes(",") || text.includes("\"") || text.includes("\n") || text.includes("\r");
    if !needsQuotes {
        return text;
    }
    return "\"" + re `"`.replaceAll(text, "\"\"") + "\"";
}

function padTwo(int number) returns string => number < 10 ? "0" + number.toString() : number.toString();

// Cents as a plain decimal amount, e.g. 7800 -> "78.00".
function formatCents(int cents) returns string => (cents / 100).toString() + "." + padTwo(cents % 100);

// The whole file: header, then one row per claim, in the order given.
function renderExportCsv(ExportRow[] rows) returns string {
    string[] lines = [CSV_HEADER];
    foreach ExportRow row in rows {
        lines.push(string:'join(",", csvCell(row.employeeName), csvCell(row.reference),
            csvCell(row.approvedOn), csvCell(formatCents(row.totalCents))));
    }
    return string:'join(CSV_EOL, ...lines) + CSV_EOL;
}

function exportFileName(int year, int month, int day, string batchId) returns string {
    string suffix = batchId.length() > 8 ? batchId.substring(0, 8) : batchId;
    return string `payroll-export-${year}${padTwo(month)}${padTwo(day)}-${suffix}.csv`;
}

// A line manager assignment: a non-empty manager id that is not the employee itself.
// Returns the trimmed manager id, or a ClaimFailure.
function validateManagerAssignment(string employeeId, string managerId) returns string|ClaimFailure {
    string trimmed = managerId.trim();
    if trimmed == "" {
        return failure("badRequest", "managerId is required");
    }
    if trimmed == employeeId {
        return failure("badRequest", "an employee cannot be their own line manager");
    }
    return trimmed;
}
