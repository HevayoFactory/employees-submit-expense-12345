// Pure approval rules. No database.

const int MAX_REASON_CHARS = 1000;

// A claim can be decided only while it is submitted; a decision is final.
function canDecide(ClaimStatus status) returns boolean => status == "submitted";

// The status after a decision, or () when the claim cannot be decided from `status`.
function statusAfterDecision(ClaimStatus status, boolean approve) returns ClaimStatus? {
    if !canDecide(status) {
        return ();
    }
    return approve ? "approved" : "rejected";
}

// A rejection needs a reason. Returns the trimmed reason, or a ClaimFailure.
function validateRejection(string reason) returns string|ClaimFailure {
    string trimmed = reason.trim();
    if trimmed == "" {
        return failure("badRequest", "a rejection needs a reason");
    }
    if trimmed.length() > MAX_REASON_CHARS {
        return failure("badRequest", "the reason is at most 1000 characters");
    }
    return trimmed;
}

// True when the status filter can match anything in a manager's list: drafts are never listed.
function listableTeamStatus(ClaimStatus? status) returns boolean => status !is "draft";
