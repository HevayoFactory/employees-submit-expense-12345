import type { ReactElement } from "react";
import {
  AppShell as OxygenAppShell,
  ColorSchemeToggle,
  Divider,
  Footer,
  Header,
  Sidebar,
  UserMenu,
} from "@wso2/oxygen-ui";
import { Banknote, CheckCheck, ClipboardList, FileText, Users, User } from "@wso2/oxygen-ui-icons-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { APP_NAME } from "../appName";
import { Can } from "../authz/gates";
import { useHeldRoles } from "../authz/gates";
import { SCREEN_ROUTES } from "../authz/screens";
import { signOut } from "../authz/session";
import { useProfile } from "../useProfile";

// The prototype's nav entries, one rail for every role; each entry is gated on
// the operation its screen loads (SCREEN_ROUTES), so a role sees only its own.
const NAV: { key: string; icon: ReactElement }[] = [
  { key: "my-claims", icon: <FileText /> },
  { key: "team-queue", icon: <ClipboardList /> },
  { key: "team-decided", icon: <CheckCheck /> },
  { key: "export", icon: <Banknote /> },
  { key: "people", icon: <Users /> },
];

function activeKey(pathname: string): string {
  const first = "/" + pathname.split("/")[1];
  if (first === "/claim-detail" || first === "/claim-edit") return "my-claims";
  if (first === "/team-claim") return "team-queue";
  return SCREEN_ROUTES.find((s) => s.path.split("/:")[0] === first)?.key ?? "";
}

export function AppShell(): ReactElement {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const profile = useProfile();
  const roles = useHeldRoles();
  const active = activeKey(pathname);

  return (
    <OxygenAppShell>
      <OxygenAppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <UserMenu>
              <UserMenu.Trigger name={profile.name || "Account"} />
              <UserMenu.Header name={profile.name} email={profile.email} role={roles.join(", ") || undefined} />
              <UserMenu.Item icon={<User />} label="Account" onClick={() => navigate("/account")} />
              <UserMenu.Logout onClick={() => void signOut()} />
            </UserMenu>
          </Header.Actions>
        </Header>
      </OxygenAppShell.Navbar>

      <OxygenAppShell.Sidebar>
        <Sidebar activeItem={active}>
          <Sidebar.Nav>
            <Sidebar.Category>
              {NAV.map(({ key, icon }) => {
                const screen = SCREEN_ROUTES.find((s) => s.key === key)!;
                if (screen.loads === null) return null;
                return (
                  <Can key={key} op={screen.loads}>
                    <Sidebar.Item id={key} link={<Link to={screen.path} />}>
                      <Sidebar.ItemIcon>{icon}</Sidebar.ItemIcon>
                      <Sidebar.ItemLabel>{screen.label}</Sidebar.ItemLabel>
                    </Sidebar.Item>
                  </Can>
                );
              })}
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </OxygenAppShell.Sidebar>

      <OxygenAppShell.Main>
        <Outlet />
      </OxygenAppShell.Main>

      <OxygenAppShell.Footer>
        <Footer>
          <Footer.Copyright>© WSO2 LLC</Footer.Copyright>
        </Footer>
      </OxygenAppShell.Footer>
    </OxygenAppShell>
  );
}
