import type { ReactElement } from "react";
import { PageContent, PageTitle } from "@wso2/oxygen-ui";

// Screen Team approvals (screen.team-queue). The page body is filled by a later issue; the route, the
// operation gate and the navigation entry already exist (src/authz/screens.ts).
export function TeamQueuePage(): ReactElement {
  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Team approvals</PageTitle.Header>
      </PageTitle>
    </PageContent>
  );
}
