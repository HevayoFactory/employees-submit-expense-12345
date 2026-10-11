import type { ReactElement } from "react";
import { PageContent, PageTitle } from "@wso2/oxygen-ui";

// Screen Team claim (screen.team-claim). The page body is filled by a later issue; the route, the
// operation gate and the navigation entry already exist (src/authz/screens.ts).
export function TeamClaimPage(): ReactElement {
  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Team claim</PageTitle.Header>
      </PageTitle>
    </PageContent>
  );
}
