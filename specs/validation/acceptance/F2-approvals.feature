Feature: F2 Approvals

  @story-F2.1
  Rule: A manager sees the submitted claims of their direct reports, oldest first

    Scenario: The queue is ordered by submission date
      Given Asha and Maya are Ravi's direct reports
      And Maya submitted claim "EC-1004" on "2026-01-12" and Asha submitted claim "EC-1002" on "2026-01-13"
      When Ravi the manager opens team approvals
      Then he sees "EC-1004" first and "EC-1002" second

  @story-F2.1
  Rule: Only the line manager sees an employee's claims

    @negative
    Scenario: Another team's claims are not listed
      Given Asha is Ravi's direct report and Joel is Dilani's direct report
      And both have submitted a claim
      When Ravi opens team approvals
      Then he sees only Asha's claim

  @story-F2.1
  Rule: Finance sets each employee's line manager

    Scenario: A newly assigned manager sees the claim
      Given Maya has a submitted claim and no line manager
      When Nimal from finance sets Ravi as Maya's line manager
      Then Ravi sees Maya's claim in team approvals

  @story-F2.2
  Rule: A manager sees the full claim before deciding

    Scenario: Opening a claim
      Given Asha has submitted claim "EC-1002" with a "Meals" line of "148.20" and the receipt "dinner.jpg"
      When Ravi opens that claim
      Then he sees the line, the receipt "dinner.jpg" and the total "$148.20"

  @story-F2.3
  Rule: A manager approves a whole claim

    Scenario: Approving a claim
      Given Asha has submitted claim "EC-1002" for "148.20"
      When Ravi approves it
      Then the claim status is "Approved"
      And Asha sees the claim as "Approved"

  @story-F2.3
  Rule: A manager never approves their own claim

    @negative
    Scenario: A manager's own claim is not in their queue
      Given Ravi has submitted claim "EC-1007" for "90.00"
      When Ravi opens team approvals
      Then claim "EC-1007" is not listed

    Scenario: A manager's claim goes to their own line manager
      Given Ravi has submitted claim "EC-1007" and Dilani is Ravi's line manager
      When Dilani opens team approvals
      Then she sees claim "EC-1007"

  @story-F2.4
  Rule: A rejection needs a reason, which the employee sees

    @negative
    Scenario: Rejecting without a reason
      Given Asha has submitted claim "EC-1002"
      When Ravi rejects it with no reason
      Then the claim status is still "Submitted"

    Scenario: Rejecting with a reason
      Given Asha has submitted claim "EC-1002"
      When Ravi rejects it with the reason "Please add the hotel receipt"
      Then the claim status is "Rejected"
      And Asha sees the reason "Please add the hotel receipt"

  @story-F2.3 @story-F2.4
  Rule: The manager's decision is final and applies to the whole claim

    @negative
    Scenario: An approved claim cannot be decided again
      Given Ravi has approved claim "EC-1002"
      Then Ravi's team approvals no longer offer an approve or reject action for it

  @story-F2.5
  Rule: A manager sees the claims they already decided

    Scenario: The decided list
      Given Ravi has approved claim "EC-1005" and rejected claim "EC-1003"
      When he opens decided claims
      Then he sees "EC-1005" as "Approved" and "EC-1003" as "Rejected"
