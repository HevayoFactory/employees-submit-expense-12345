import ballerina/test;
import ballerina/lang.array;

ExpenseLineInput travel = {date: "2026-01-10", amountCents: 4500, categoryId: "travel", note: "Train"};
ExpenseLineInput meals = {date: "2026-01-10", amountCents: 2050, categoryId: "meals"};

@test:Config {}
function totalIsSumOfLines() {
    test:assertEquals(totalCents([travel, meals]), 6550);
    test:assertEquals(totalCents([travel]), 4500);
}

@test:Config {}
function validClaimPasses() {
    test:assertEquals(validateClaimInput({lines: [travel, meals]}), ());
}

@test:Config {}
function claimNeedsALine() {
    test:assertTrue(validateClaimInput({lines: []}) is string);
}

@test:Config {}
function lineFieldsAreChecked() {
    test:assertTrue(validateClaimInput({lines: [{date: "2026-02-30", amountCents: 100, categoryId: "travel"}]}) is string);
    test:assertTrue(validateClaimInput({lines: [{date: "10/01/2026", amountCents: 100, categoryId: "travel"}]}) is string);
    test:assertTrue(validateClaimInput({lines: [{date: "2026-01-10", amountCents: 0, categoryId: "travel"}]}) is string);
    test:assertTrue(validateClaimInput({lines: [{date: "2026-01-10", amountCents: -5, categoryId: "travel"}]}) is string);
    test:assertTrue(validateClaimInput({lines: [{date: "2026-01-10", amountCents: MAX_LINE_CENTS + 1, categoryId: "travel"}]}) is string);
    test:assertTrue(validateClaimInput({lines: [{date: "2026-01-10", amountCents: 100, categoryId: " "}]}) is string);
}

@test:Config {}
function datesRespectTheCalendar() {
    test:assertTrue(isValidDate("2024-02-29"));
    test:assertFalse(isValidDate("2025-02-29"));
    test:assertFalse(isValidDate("2026-13-01"));
    test:assertFalse(isValidDate("2026-04-31"));
    test:assertTrue(isValidDate("2026-12-31"));
}

@test:Config {}
function categoriesMustExist() {
    string[] known = ["travel", "meals"];
    test:assertEquals(unknownCategory([travel, meals], known), ());
    test:assertEquals(unknownCategory([{date: "2026-01-10", amountCents: 1, categoryId: "yacht"}], known),
        "unknown categoryId: yacht");
}

@test:Config {}
function onlyDraftAndRejectedAreEditable() {
    test:assertTrue(canEdit("draft"));
    test:assertTrue(canEdit("rejected"));
    test:assertFalse(canEdit("submitted"));
    test:assertFalse(canEdit("approved"));
    test:assertFalse(canEdit("exported"));
}

@test:Config {}
function submitTransitions() {
    test:assertEquals(statusAfterSubmit("draft"), "submitted");
    test:assertEquals(statusAfterSubmit("rejected"), "submitted");
    test:assertEquals(statusAfterSubmit("submitted"), ());
    test:assertEquals(statusAfterSubmit("approved"), ());
    test:assertEquals(statusAfterSubmit("exported"), ());
}

@test:Config {}
function statusParsing() {
    test:assertEquals(parseStatus("rejected"), "rejected");
    test:assertTrue(parseStatus("bogus") is error);
}

@test:Config {}
function receiptIsDecodedAndBounded() {
    DecodedReceipt|ClaimFailure ok = decodeReceipt({fileName: "lunch.pdf", contentType: "application/pdf", contentBase64: "aGVsbG8="});
    test:assertTrue(ok is DecodedReceipt);
    if ok is DecodedReceipt {
        test:assertEquals(ok.content.length(), 5);
    }
    test:assertTrue(decodeReceipt({fileName: "", contentType: "application/pdf", contentBase64: "aGVsbG8="}) is ClaimFailure);
    test:assertTrue(decodeReceipt({fileName: "a.pdf", contentType: "pdf", contentBase64: "aGVsbG8="}) is ClaimFailure);
    test:assertTrue(decodeReceipt({fileName: "a.pdf", contentType: "application/pdf", contentBase64: "!!notbase64"}) is ClaimFailure);
    test:assertTrue(decodeReceipt({fileName: "a.pdf", contentType: "application/pdf", contentBase64: ""}) is ClaimFailure);
    byte[] big = [];
    int i = 0;
    while i < MAX_RECEIPT_BYTES + 1 {
        big.push(65);
        i += 1;
    }
    string bigText = array:toBase64(big);
    test:assertTrue(decodeReceipt({fileName: "a.pdf", contentType: "application/pdf", contentBase64: bigText}) is ClaimFailure);
}

@test:Config {}
function failuresMapToStatuses() {
    test:assertEquals(failureResponse(failure("notFound", "x")).body.code, 404);
    test:assertEquals(failureResponse(failure("conflict", "x")).body.code, 409);
    test:assertEquals(failureResponse(failure("badRequest", "x")).body.code, 400);
}
