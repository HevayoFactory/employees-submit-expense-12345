import type { ReactElement } from "react";
import { PageContent, PageTitle } from "@wso2/oxygen-ui";

// Screen People (screen.people). The page body is filled by a later issue; the route, the
// operation gate and the navigation entry already exist (src/authz/screens.ts).
export function PeoplePage(): ReactElement {
  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>People</PageTitle.Header>
      </PageTitle>
    </PageContent>
  );
}
