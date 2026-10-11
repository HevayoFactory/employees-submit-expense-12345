// Types generated from openapi.yaml by `bal openapi`; regenerate rather than edit.

import ballerina/constraint;
import ballerina/http;

public type Category record {
    string id;
    string name;
};

public type Receipt record {
    string fileName;
    string contentType;
    # file content; at most 5 MB decoded
    string contentBase64;
};

public type ExpenseLineInput record {
    string date;
    # amount in cents of the company currency
    @constraint:Int {minValue: 1}
    int amountCents;
    string categoryId;
    string note?;
};

public type ErrorConflict record {|
    *http:Conflict;
    Error body;
|};

public type Error record {
    # HTTP or application error code
    int code;
    # short human-readable label
    string message;
    # detailed explanation
    string description?;
    # URI to documentation
    string moreInfo?;
};

public type ErrorBadRequest record {|
    *http:BadRequest;
    Error body;
|};

public type ManagerAssignment record {
    string managerId;
};

public type ExportBatch record {
    string id;
    string createdAt;
    int claimCount;
    int totalCents;
    string fileName;
};

public type ClaimOk record {|
    *http:Ok;
    Claim body;
|};

public type ClaimSummaryPage record {
    int count;
    string? next?;
    string? previous?;
    ClaimSummary[] data;
};

public type Rejection record {
    @constraint:String {minLength: 1}
    string reason;
};

public type ErrorNotFound record {|
    *http:NotFound;
    Error body;
|};

public type PendingClaimPage record {
    int count;
    string? next?;
    string? previous?;
    PendingClaim[] data;
};

public type Employee record {
    string id;
    string name;
    string email;
    # the line manager's employee id; null until Finance sets it
    string? managerId?;
    string? managerName?;
};

public type PendingClaim record {
    string id;
    string reference;
    string employeeName;
    int totalCents;
    string approvedAt;
};

public type ClaimSummary record {
    string id;
    string reference;
    string employeeName;
    ClaimStatus status;
    int totalCents;
    string? submittedAt?;
    string? decidedAt?;
};

public type ClaimStatus "draft"|"submitted"|"approved"|"rejected"|"exported";

public type EmployeePage record {
    int count;
    string? next?;
    string? previous?;
    Employee[] data;
};

public type ExpenseLine record {
    *ExpenseLineInput;
    string id;
    string categoryName?;
    # null when no receipt is attached
    string? receiptFileName?;
};

public type ClaimInput record {
    @constraint:Array {minLength: 1}
    ExpenseLineInput[] lines;
};

public type Claim record {
    string id;
    string reference;
    string employeeId;
    string employeeName;
    ClaimStatus status;
    # sum of the lines in cents
    int totalCents;
    string? submittedAt?;
    string? decidedAt?;
    string? rejectionReason?;
    string? exportBatchId?;
    ExpenseLine[] lines;
};

public type ExportBatchPage record {
    int count;
    string? next?;
    string? previous?;
    ExportBatch[] data;
};

public type ErrorUnauthorized record {|
    *http:Unauthorized;
    Error body;
|};
