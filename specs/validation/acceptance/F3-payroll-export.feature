Feature: F3 Payroll export

  @story-F3.1
  Rule: Finance sees the approved claims that have not been exported

    Scenario: The waiting list
      Given claim "EC-1005" for Maya at "78.00" is approved
      And claim "EC-1008" for Asha at "120.00" is approved
      When Nimal from finance opens payroll export
      Then he sees both claims with employee, total and approval date

    @negative
    Scenario: Claims that are not approved are not listed
      Given claim "EC-1004" is submitted and claim "EC-1003" is rejected
      When Nimal opens payroll export
      Then neither claim is listed

  @story-F3.2
  Rule: One export contains every approved claim not yet exported, as a CSV file

    Scenario: Exporting all waiting claims
      Given claim "EC-1005" for Maya at "78.00" and claim "EC-1008" for Asha at "120.00" are approved
      When Nimal exports the approved claims
      Then he downloads one CSV file with two rows
      And each row has the employee, the claim reference, the approval date and the total

  @story-F3.2
  Rule: Finance cannot export when nothing is waiting

    @negative
    Scenario: Nothing to export
      Given no claim is approved and waiting
      When Nimal exports the approved claims
      Then no new export is added to the history
      And he is told there is nothing to export

  @story-F3.3
  Rule: An exported claim is marked exported and never exported again

    Scenario: Claims are marked after export
      Given claim "EC-1005" is approved
      When Nimal exports the approved claims
      Then Maya sees claim "EC-1005" as "Exported"

    @negative
    Scenario: A second export does not repeat claims
      Given claim "EC-1005" was included in an earlier export
      And claim "EC-1008" is newly approved
      When Nimal exports the approved claims
      Then the new file contains only "EC-1008"

  @story-F3.4
  Rule: Finance can download earlier export files again

    Scenario: Downloading an earlier file
      Given an export created on "2026-01-08" contained claim "EC-1006"
      When Nimal opens the export history and downloads that file
      Then the file contains claim "EC-1006"

  @story-F3.1 @story-F3.2
  Rule: Only finance may see or create exports

    @negative
    Scenario: A manager cannot reach payroll export
      Given Ravi is signed in as a manager
      Then payroll export is not offered to him
