Feature: F1 Submit expense claims

  @story-F1.1 @story-F1.8
  Rule: A claim is made of expense lines and its total is their sum

    Scenario: A claim with two lines
      Given Asha the employee starts a new claim
      When she adds a "Travel" line of "45.00" dated "2026-01-10" with the note "Train to client site"
      And she adds a "Meals" line of "20.50" dated "2026-01-10" with the note "Lunch with client"
      Then the claim shows two expense lines
      And the claim total is "$65.50"

  @story-F1.2
  Rule: A receipt is an optional attachment on each expense line

    Scenario: Attaching a receipt to a line
      Given Asha has a draft claim with a "Meals" line of "20.50"
      When she attaches the receipt "lunch.pdf" to that line
      Then the line shows the receipt "lunch.pdf"

    Scenario: Submitting a line without a receipt
      Given Asha has a draft claim with one "Meals" line of "20.50" and no receipt
      When she submits the claim
      Then the claim status is "Submitted"

  @story-F1.3 @story-F1.4
  Rule: A draft can be edited until it is submitted

    Scenario: Editing a draft
      Given Asha has a draft claim with a "Travel" line of "45.00"
      When she removes that line and adds a "Travel" line of "52.00"
      Then the claim total is "$52.00"
      And the claim status is "Draft"

    Scenario: Submitting a draft
      Given Asha has a draft claim with a "Travel" line of "45.00"
      When she submits the claim
      Then the claim status is "Submitted"

  @story-F1.4
  Rule: A submitted claim cannot be edited until it is rejected

    @negative
    Scenario: Editing a submitted claim
      Given Asha has submitted a claim with a "Travel" line of "45.00"
      Then the claim offers no way to edit or remove its lines
      And the claim total is still "$45.00"

  @story-F1.5
  Rule: An employee sees each of their claims with its status

    Scenario: The claim list shows statuses
      Given Asha has one draft claim, one submitted claim and one approved claim
      When she opens her claims
      Then she sees three claims
      And the statuses shown are "Draft", "Submitted" and "Approved"

  @story-F1.5
  Rule: An employee sees only their own claims

    @negative
    Scenario: Another employee's claims are not listed
      Given Asha has one claim and Maya has two claims
      When Asha opens her claims
      Then she sees exactly one claim

  @story-F1.6 @story-F1.7
  Rule: A rejected claim shows its reason and is edited and resubmitted as the same claim

    Scenario: Reading the rejection reason
      Given Ravi has rejected Asha's claim with the reason "The taxi needs a receipt"
      When Asha opens that claim
      Then she sees the reason "The taxi needs a receipt"

    Scenario: Resubmitting after a rejection
      Given Ravi has rejected Asha's claim with the reason "The taxi needs a receipt"
      When Asha attaches the receipt "taxi.pdf" to the taxi line and resubmits the claim
      Then the claim keeps its reference
      And the claim status is "Submitted"
      And Asha still has exactly one claim with that reference
