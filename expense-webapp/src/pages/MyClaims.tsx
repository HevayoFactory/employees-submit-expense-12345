import type { ReactElement } from "react";
import { PageContent, PageTitle } from "@wso2/oxygen-ui";

// Screen My claims (screen.my-claims). The page body is filled by a later issue; the route, the
// operation gate and the navigation entry already exist (src/authz/screens.ts).
export function MyClaimsPage(): ReactElement {
  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>My claims</PageTitle.Header>
      </PageTitle>
    </PageContent>
  );
}
