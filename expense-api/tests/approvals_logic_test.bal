import ballerina/test;

@test:Config {}
function onlySubmittedClaimsCanBeDecided() {
    test:assertTrue(canDecide("submitted"));
    foreach ClaimStatus status in <ClaimStatus[]>["draft", "approved", "rejected", "exported"] {
        test:assertFalse(canDecide(status));
        test:assertEquals(statusAfterDecision(status, true), ());
        test:assertEquals(statusAfterDecision(status, false), ());
    }
}

@test:Config {}
function decisionsMapToStatus() {
    test:assertEquals(statusAfterDecision("submitted", true), "approved");
    test:assertEquals(statusAfterDecision("submitted", false), "rejected");
}

@test:Config {}
function rejectionNeedsAReason() {
    test:assertTrue(validateRejection("") is ClaimFailure);
    test:assertTrue(validateRejection("   ") is ClaimFailure);
    test:assertEquals(validateRejection("  Please add the hotel receipt "), "Please add the hotel receipt");
    string tooLong = string:'join("", ...from int _ in 0 ..< 1001 select "x");
    test:assertTrue(validateRejection(tooLong) is ClaimFailure);
}

@test:Config {}
function draftsAreNeverListed() {
    test:assertFalse(listableTeamStatus("draft"));
    test:assertTrue(listableTeamStatus(()));
    test:assertTrue(listableTeamStatus("approved"));
}
