import ballerina/test;

@test:Config {}
function csvCellQuotesAndEscapes() {
    test:assertEquals(csvCell("Maya"), "Maya");
    test:assertEquals(csvCell("Lee, Ann"), "\"Lee, Ann\"");
    test:assertEquals(csvCell("say \"hi\""), "\"say \"\"hi\"\"\"");
    test:assertEquals(csvCell("a\nb"), "\"a\nb\"");
}

@test:Config {}
function csvCellNeutralisesFormulas() {
    test:assertEquals(csvCell("=SUM(A1)"), "'=SUM(A1)");
    test:assertEquals(csvCell("+1"), "'+1");
    test:assertEquals(csvCell("-1"), "'-1");
    test:assertEquals(csvCell("@cmd"), "'@cmd");
    test:assertEquals(csvCell("=1,2"), "\"'=1,2\"");
    test:assertEquals(csvCell(""), "");
}

@test:Config {}
function centsFormatAsDecimals() {
    test:assertEquals(formatCents(7800), "78.00");
    test:assertEquals(formatCents(12005), "120.05");
    test:assertEquals(formatCents(5), "0.05");
}

@test:Config {}
function exportCsvHasHeaderAndOneRowPerClaim() {
    ExportRow[] rows = [
        {employeeName: "Maya", reference: "EXP-000005", approvedOn: "2026-01-08", totalCents: 7800},
        {employeeName: "=Evil", reference: "EXP-000008", approvedOn: "2026-01-09", totalCents: 12000}
    ];
    test:assertEquals(renderExportCsv(rows),
        "employee,claim reference,approval date,total\r\n"
        + "Maya,EXP-000005,2026-01-08,78.00\r\n"
        + "'=Evil,EXP-000008,2026-01-09,120.00\r\n");
}

@test:Config {}
function exportFileNameIsStable() {
    test:assertEquals(exportFileName(2026, 1, 8, "abcdef12-3456"), "payroll-export-20260108-abcdef12.csv");
}

@test:Config {}
function managerAssignmentRules() {
    test:assertTrue(validateManagerAssignment("e1", "e1") is ClaimFailure);
    test:assertTrue(validateManagerAssignment("e1", "  ") is ClaimFailure);
    test:assertEquals(validateManagerAssignment("e1", " e2 "), "e2");
}
