import type { ReactElement } from "react";
import { PageContent, PageTitle } from "@wso2/oxygen-ui";

// Screen Decided claims (screen.team-decided). The page body is filled by a later issue; the route, the
// operation gate and the navigation entry already exist (src/authz/screens.ts).
export function TeamDecidedPage(): ReactElement {
  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Decided claims</PageTitle.Header>
      </PageTitle>
    </PageContent>
  );
}
