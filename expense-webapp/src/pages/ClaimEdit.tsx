import type { ReactElement } from "react";
import { PageContent, PageTitle } from "@wso2/oxygen-ui";

// Screen Edit claim (screen.claim-edit). The page body is filled by a later issue; the route, the
// operation gate and the navigation entry already exist (src/authz/screens.ts).
export function ClaimEditPage(): ReactElement {
  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Edit claim</PageTitle.Header>
      </PageTitle>
    </PageContent>
  );
}
