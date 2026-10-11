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

    resource function get me/claims(http:RequestContext ctx, ClaimStatus? status, int 'limit = 20, int offset = 0)
            returns ClaimSummaryPage|ErrorBadRequest|ErrorUnauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        PageParams|ErrorBadRequest page = pageParams('limit, offset);
        if page is ErrorBadRequest {
            return page;
        }
        ClaimSummaryPage|error result = listClaims(caller.userId, status, page, "/me/claims");
        if result is error {
            log:printError("listing claims failed", 'error = result);
            return internalError();
        }
        return result;
    }

    resource function post me/claims(http:RequestContext ctx, @http:Payload ClaimInput payload)
            returns http:Created|ErrorBadRequest|ErrorUnauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        Claim|ClaimFailure|error result = createMyClaimFor(caller, payload);
        if result is ClaimFailure {
            return badRequestError(result.message());
        }
        if result is error {
            log:printError("creating a claim failed", 'error = result);
            return internalError();
        }
        return <http:Created>{body: result};
    }

    resource function get me/claims/[string claimId](http:RequestContext ctx)
            returns Claim|ErrorUnauthorized|ErrorNotFound|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        Claim|ClaimFailure|error result = readMyClaim(caller, claimId);
        if result is ClaimFailure {
            return notFoundError();
        }
        if result is error {
            log:printError("reading a claim failed", 'error = result);
            return internalError();
        }

        return result;
    }

    resource function put me/claims/[string claimId](http:RequestContext ctx, @http:Payload ClaimInput payload)
            returns Claim|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound|ErrorConflict|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        Claim|ClaimFailure|error result = updateMyClaimFor(caller, claimId, payload);
        if result is ClaimFailure {
            return failureResponse(result);
        }
        if result is error {
            log:printError("updating a claim failed", 'error = result);
            return internalError();
        }

        return result;
    }

    resource function post me/claims/[string claimId]/submit(http:RequestContext ctx)
            returns Claim|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound|ErrorConflict|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        Claim|ClaimFailure|error result = submitMyClaimFor(caller, claimId);
        if result is ClaimFailure {
            return failureResponse(result);
        }
        if result is error {
            log:printError("submitting a claim failed", 'error = result);
            return internalError();
        }

        return result;
    }

    resource function get me/claims/[string claimId]/expense\-lines/[string lineId]/receipt(http:RequestContext ctx)
            returns Receipt|ErrorUnauthorized|ErrorNotFound|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        Receipt|ClaimFailure|error result = getMyReceiptFor(caller, claimId, lineId);
        if result is ClaimFailure {
            return notFoundError();
        }
        if result is error {
            log:printError("reading a receipt failed", 'error = result);
            return internalError();
        }

        return result;
    }

    resource function put me/claims/[string claimId]/expense\-lines/[string lineId]/receipt(
            http:RequestContext ctx, @http:Payload Receipt payload)
            returns http:NoContent|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound|ErrorConflict|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        ()|ClaimFailure|error result = attachMyReceiptFor(caller, claimId, lineId, payload);
        if result is ClaimFailure {
            return failureResponse(result);
        }
        if result is error {
            log:printError("attaching a receipt failed", 'error = result);
            return internalError();
        }

        return http:NO_CONTENT;
    }

    // ---- approvals (issue #8) ----

    resource function get me/team/claims(http:RequestContext ctx, ClaimStatus? status, int 'limit = 20, int offset = 0)
            returns ClaimSummaryPage|ErrorBadRequest|ErrorUnauthorized|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        PageParams|ErrorBadRequest page = pageParams('limit, offset);
        if page is ErrorBadRequest {
            return page;
        }
        ClaimSummaryPage|error result = listTeamClaims(caller.userId, status, page, "/me/team/claims");
        if result is error {
            log:printError("listing team claims failed", 'error = result);
            return internalError();
        }
        return result;
    }

    resource function get me/team/claims/[string claimId](http:RequestContext ctx)
            returns Claim|ErrorUnauthorized|ErrorNotFound|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        Claim|ClaimFailure|error result = readTeamClaim(caller, claimId);
        if result is ClaimFailure {
            return notFoundError();
        }
        if result is error {
            log:printError("reading a team claim failed", 'error = result);
            return internalError();
        }
        return result;
    }

    resource function post me/team/claims/[string claimId]/approve(http:RequestContext ctx)
            returns Claim|ErrorUnauthorized|ErrorNotFound|ErrorConflict|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        Claim|ClaimFailure|error result = approveTeamClaimFor(caller, claimId);
        if result is ClaimFailure {
            ErrorBadRequest|ErrorNotFound|ErrorConflict refusal = failureResponse(result);
            if refusal is ErrorNotFound {
                return refusal;
            }
            if refusal is ErrorConflict {
                return refusal;
            }
            return internalError();
        }
        if result is error {
            log:printError("approving a claim failed", 'error = result);
            return internalError();
        }
        return result;
    }

    resource function post me/team/claims/[string claimId]/reject(http:RequestContext ctx, @http:Payload Rejection payload)
            returns Claim|ErrorBadRequest|ErrorUnauthorized|ErrorNotFound|ErrorConflict|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        Claim|ClaimFailure|error result = rejectTeamClaimFor(caller, claimId, payload);
        if result is ClaimFailure {
            return failureResponse(result);
        }
        if result is error {
            log:printError("rejecting a claim failed", 'error = result);
            return internalError();
        }
        return result;
    }

    resource function get me/team/claims/[string claimId]/expense\-lines/[string lineId]/receipt(http:RequestContext ctx)
            returns Receipt|ErrorUnauthorized|ErrorNotFound|http:InternalServerError {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return unauthorizedError();
        }
        Receipt|ClaimFailure|error result = getTeamReceiptFor(caller, claimId, lineId);
        if result is ClaimFailure {
            return notFoundError();
        }
        if result is error {
            log:printError("reading a team receipt failed", 'error = result);
            return internalError();
        }
        return result;
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
