import ballerina/http;
import ballerina/log;

listener http:Listener ep0 = new (servicePort);

// Resources follow openapi.yaml. The gateway has already enforced each
// operation's scope; handlers only resolve the caller. Operations whose
// feature is built in a later issue answer 501 until then: move each into
// its own feature file's function and return the real result.
service http:InterceptableService / on ep0 {

    public function createInterceptors() returns AssertionInterceptor => new;

    // The signed-in employee
    resource function get me(http:RequestContext ctx)
            returns Employee|ErrorUnauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        Employee|error employee = ensureEmployee(caller);
        if employee is error {
            log:printError("resolving the current employee failed", 'error = employee);
            return internalError();
        }
        return employee;
    }

    // The fixed list of expense categories
    resource function get categories(http:RequestContext ctx)
            returns Category[]|ErrorUnauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        Category[]|error categories = loadCategories();
        if categories is error {
            log:printError("loading categories failed", 'error = categories);
            return internalError();
        }
        return categories;
    }

    // ---- claims (issue #6) ----

    resource function get me/claims(ClaimStatus? status, int 'limit = 20, int offset = 0)
            returns ClaimSummaryPage|ErrorUnauthorized|http:NotImplemented {
        return notImplemented();
    }

    resource function post me/claims(@http:Payload ClaimInput payload)
            returns Claim|ErrorBadRequest|ErrorUnauthorized|http:NotImplemented {
        return notImplemented();
    }

    resource function get me/claims/[string claimId]()
            returns Claim|ErrorUnauthorized|ErrorNotFound|http:NotImplemented {
        return notImplemented();
    }

    resource function put me/claims/[string claimId](@http:Payload ClaimInput payload)
            returns Claim|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound|ErrorConflict|http:NotImplemented {
        return notImplemented();
    }

    resource function post me/claims/[string claimId]/submit()
            returns ClaimOk|ErrorUnauthorized|ErrorNotFound|ErrorConflict|http:NotImplemented {
        return notImplemented();
    }

    resource function get me/claims/[string claimId]/expense\-lines/[string lineId]/receipt()
            returns Receipt|ErrorUnauthorized|ErrorNotFound|http:NotImplemented {
        return notImplemented();
    }

    resource function put me/claims/[string claimId]/expense\-lines/[string lineId]/receipt(@http:Payload Receipt payload)
            returns http:NoContent|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound|ErrorConflict|http:NotImplemented {
        return notImplemented();
    }

    // ---- approvals (issue #8) ----

    resource function get me/team/claims(ClaimStatus? status, int 'limit = 20, int offset = 0)
            returns ClaimSummaryPage|ErrorUnauthorized|http:NotImplemented {
        return notImplemented();
    }

    resource function get me/team/claims/[string claimId]()
            returns Claim|ErrorUnauthorized|ErrorNotFound|http:NotImplemented {
        return notImplemented();
    }

    resource function post me/team/claims/[string claimId]/approve()
            returns ClaimOk|ErrorUnauthorized|ErrorNotFound|ErrorConflict|http:NotImplemented {
        return notImplemented();
    }

    resource function post me/team/claims/[string claimId]/reject(@http:Payload Rejection payload)
            returns ClaimOk|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound|ErrorConflict|http:NotImplemented {
        return notImplemented();
    }

    resource function get me/team/claims/[string claimId]/expense\-lines/[string lineId]/receipt()
            returns Receipt|ErrorUnauthorized|ErrorNotFound|http:NotImplemented {
        return notImplemented();
    }

    // ---- people and exports (issue #10) ----

    resource function get employees(int 'limit = 20, int offset = 0)
            returns EmployeePage|ErrorUnauthorized|http:NotImplemented {
        return notImplemented();
    }

    resource function put employees/[string employeeId]/manager(@http:Payload ManagerAssignment payload)
            returns Employee|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound|http:NotImplemented {
        return notImplemented();
    }

    resource function get export\-candidates(int 'limit = 20, int offset = 0)
            returns PendingClaimPage|ErrorUnauthorized|http:NotImplemented {
        return notImplemented();
    }

    resource function get exports(int 'limit = 20, int offset = 0)
            returns ExportBatchPage|ErrorUnauthorized|http:NotImplemented {
        return notImplemented();
    }

    resource function post exports()
            returns ExportBatch|ErrorUnauthorized|ErrorConflict|http:NotImplemented {
        return notImplemented();
    }

    resource function get exports/[string exportId]/file()
            returns string|ErrorUnauthorized|ErrorNotFound|http:NotImplemented {
        return notImplemented();
    }
}
