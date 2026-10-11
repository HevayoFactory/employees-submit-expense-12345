import type { ReactElement } from "react";
import { PageContent, PageTitle } from "@wso2/oxygen-ui";

// Screen Payroll export (screen.export). The page body is filled by a later issue; the route, the
// operation gate and the navigation entry already exist (src/authz/screens.ts).
export function PayrollExportPage(): ReactElement {
  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Payroll export</PageTitle.Header>
      </PageTitle>
    </PageContent>
  );
}
