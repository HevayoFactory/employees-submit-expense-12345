import ballerina/lang.'int as ints;
import ballerina/lang.array;

// Pure claim rules: validation, totals and state transitions. No database.

const int MAX_RECEIPT_BYTES = 5242880;
// Longest base64 text that can decode to MAX_RECEIPT_BYTES (with padding).
const int MAX_RECEIPT_BASE64_CHARS = 6990508;
// Upper bound for one line, so a sum of lines cannot overflow an int.
const int MAX_LINE_CENTS = 1000000000000;

// Why an operation did not produce its result.
type FailureKind "notFound"|"conflict"|"badRequest";

// An expected refusal; it is an error so it propagates with `check` and rolls a transaction back.
type ClaimFailure distinct error<record {|FailureKind kind;|}>;

function failure(FailureKind kind, string description) returns ClaimFailure => error ClaimFailure(description, kind = kind);

// A claim can be edited, and submitted, only while it is a draft or was rejected.
function canEdit(ClaimStatus status) returns boolean => status == "draft" || status == "rejected";

// The status after a submit, or () when the claim cannot be submitted from `status`.
function statusAfterSubmit(ClaimStatus status) returns ClaimStatus? {
    if canEdit(status) {
        return "submitted";
    }
    return ();
}

function parseStatus(string text) returns ClaimStatus|error {
    match text {
        "draft" => {
            return "draft";
        }
        "submitted" => {
            return "submitted";
        }
        "approved" => {
            return "approved";
        }
        "rejected" => {
            return "rejected";
        }
        "exported" => {
            return "exported";
        }
    }
    return error("unknown claim status: " + text);
}

// The claim total: the sum of its lines in cents.
function totalCents(ExpenseLineInput[] lines) returns int {
    int total = 0;
    foreach ExpenseLineInput line in lines {
        total += line.amountCents;
    }
    return total;
}

function isLeapYear(int year) returns boolean => (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;

function daysInMonth(int year, int month) returns int {
    match month {
        2 => {
            return isLeapYear(year) ? 29 : 28;
        }
        4|6|9|11 => {
            return 30;
        }
    }
    return 31;
}

// True for a real calendar date written YYYY-MM-DD.
function isValidDate(string text) returns boolean {
    if !re `[0-9]{4}-[0-9]{2}-[0-9]{2}`.isFullMatch(text) {
        return false;
    }
    int|error year = ints:fromString(text.substring(0, 4));
    int|error month = ints:fromString(text.substring(5, 7));
    int|error day = ints:fromString(text.substring(8, 10));
    if year is error || month is error || day is error {
        return false;
    }
    if year < 1 || month < 1 || month > 12 {
        return false;
    }
    return day >= 1 && day <= daysInMonth(year, month);
}

// Checks a claim body. Returns the first problem, or () when it is valid.
function validateClaimInput(ClaimInput input) returns string? {
    if input.lines.length() == 0 {
        return "a claim needs at least one expense line";
    }
    int position = 0;
    foreach ExpenseLineInput line in input.lines {
        position += 1;
        string label = string `line ${position}`;
        if !isValidDate(line.date) {
            return label + ": date must be a valid date as YYYY-MM-DD";
        }
        if line.amountCents < 1 {
            return label + ": amountCents must be positive";
        }
        if line.amountCents > MAX_LINE_CENTS {
            return label + ": amountCents is too large";
        }
        if line.categoryId.trim() == "" {
            return label + ": categoryId is required";
        }
    }
    return ();
}

// Every line's category must be one of the known category ids.
function unknownCategory(ExpenseLineInput[] lines, string[] knownIds) returns string? {
    foreach ExpenseLineInput line in lines {
        if knownIds.indexOf(line.categoryId) is () {
            return "unknown categoryId: " + line.categoryId;
        }
    }
    return ();
}

type DecodedReceipt record {|
    string fileName;
    string contentType;
    byte[] content;
|};

// Checks a receipt and decodes its content. At most 5 MB once decoded.
function decodeReceipt(Receipt receipt) returns DecodedReceipt|ClaimFailure {
    if receipt.fileName.trim() == "" || receipt.fileName.length() > 255 {
        return failure("badRequest", "fileName is required and at most 255 characters");
    }
    if receipt.contentType.trim() == "" || !receipt.contentType.includes("/") {
        return failure("badRequest", "contentType must be a media type such as application/pdf");
    }
    if receipt.contentBase64.length() > MAX_RECEIPT_BASE64_CHARS {
        return failure("badRequest", "the receipt is larger than 5 MB");
    }
    byte[]|error content = array:fromBase64(receipt.contentBase64);
    if content is error {
        return failure("badRequest", "contentBase64 is not valid base64");
    }
    if content.length() == 0 {
        return failure("badRequest", "the receipt is empty");
    }
    if content.length() > MAX_RECEIPT_BYTES {
        return failure("badRequest", "the receipt is larger than 5 MB");
    }
    return {fileName: receipt.fileName, contentType: receipt.contentType, content};
}

function failureResponse(ClaimFailure problem) returns ErrorBadRequest|ErrorNotFound|ErrorConflict {
    match problem.detail().kind {
        "notFound" => {
            return notFoundError();
        }
        "conflict" => {
            ErrorConflict refusal = {body: {code: 409, message: "Conflict", description: problem.message()}};
            return refusal;
        }
    }
    return badRequestError(problem.message());
}
