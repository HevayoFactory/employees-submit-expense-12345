import type { ReactElement } from "react";
import { PageContent, PageTitle } from "@wso2/oxygen-ui";

// Screen Claim (screen.claim-detail). The page body is filled by a later issue; the route, the
// operation gate and the navigation entry already exist (src/authz/screens.ts).
export function ClaimDetailPage(): ReactElement {
  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Claim</PageTitle.Header>
      </PageTitle>
    </PageContent>
  );
}
