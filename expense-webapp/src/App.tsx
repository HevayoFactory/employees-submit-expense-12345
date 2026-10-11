import { useEffect, type ReactElement } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Box, Typography } from "@wso2/oxygen-ui";
import {
  AuthzProvider,
  Forbidden,
  NoAccess,
  RequireOperation,
  useAuthz,
  useScopes,
} from "./authz/gates";
import { SCREEN_ROUTES, reachableScreens, hasScopedReach } from "./authz/screens";
import { setForbiddenNavigator } from "./authz/client";
import { signIn } from "./authz/session";
import { APP_NAME } from "./appName";
import { AppShell } from "./shell/AppShell";
import { CallbackPage } from "./pages/Callback";
import { AccountPage } from "./pages/Account";
import { SignedOutPage } from "./pages/SignedOut";
import { MyClaimsPage } from "./pages/MyClaims";
import { ClaimDetailPage } from "./pages/ClaimDetail";
import { ClaimEditPage } from "./pages/ClaimEdit";
import { TeamQueuePage } from "./pages/TeamQueue";
import { TeamClaimPage } from "./pages/TeamClaim";
import { TeamDecidedPage } from "./pages/TeamDecided";
import { PayrollExportPage } from "./pages/PayrollExport";
import { PeoplePage } from "./pages/People";

/** Pages keyed by the screen keys src/authz/screens.ts declares. */
const PAGE_BY_KEY: Record<string, ReactElement> = {
  "my-claims": <MyClaimsPage />,
  "claim-detail": <ClaimDetailPage />,
  "claim-new": <ClaimEditPage />,
  "claim-edit": <ClaimEditPage />,
  "team-queue": <TeamQueuePage />,
  "team-claim": <TeamClaimPage />,
  "team-decided": <TeamDecidedPage />,
  export: <PayrollExportPage />,
  people: <PeoplePage />,
  account: <AccountPage />,
  "signed-out": <SignedOutPage />,
};

/** The screens reachable before sign-in — routed above the guard, below. */
const PUBLIC_SCREENS = SCREEN_ROUTES.filter((screen) => screen.public);

export default function App(): ReactElement {
  return (
    <>
      <ForbiddenWiring />
      <Routes>
        <Route path="/callback" element={<CallbackPage />} />
        {PUBLIC_SCREENS.map((screen) => (
          <Route
            key={screen.key}
            path={screen.path}
            element={
              <AuthzProvider fallback={<Splash />}>{PAGE_BY_KEY[screen.key]}</AuthzProvider>
            }
          />
        ))}
        <Route
          path="*"
          element={
            <AuthzProvider fallback={<Splash />}>
              <SignedIn />
            </AuthzProvider>
          }
        />
      </Routes>
    </>
  );
}

/**
 * Hands src/authz/client.ts the route a refusal goes to. ONCE, from inside the
 * router and above every route, so it is wired before the first request can be
 * answered. `replace` keeps the refused URL out of the history, so Back does
 * not walk the user straight into the same 403.
 */
function ForbiddenWiring(): null {
  const navigate = useNavigate();
  useEffect(() => {
    setForbiddenNavigator(() => navigate("/forbidden", { replace: true }));
  }, [navigate]);
  return null;
}

function Splash(): ReactElement {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5">{APP_NAME}</Typography>
      <Typography color="text.secondary">Checking your session…</Typography>
    </Box>
  );
}

function SignedIn(): ReactElement {
  const { signedIn } = useAuthz();
  const scopes = useScopes();

  // The load-time guard. Only a MISSING session starts a sign-in: currentUser()
  // has already tried a silent renew, and signing in on a merely expired token
  // re-logs the user in on every visit.
  useEffect(() => {
    if (!signedIn) void signIn();
  }, [signedIn]);

  if (!signedIn) return <Splash />;

  const reachable = reachableScreens(scopes, signedIn);

  // NoAccess REPLACES the shell. It is returned here, above the <Routes> that
  // carry AppShell, so there is no rail to wrap it.
  //
  // The question is `hasScopedReach`, not `reachable.length === 0`: a
  // `loads: null` form is reachable by any signed-in caller and a `public`
  // screen by everyone, so an app holding either would never show NoAccess to
  // a caller with no scopes — it would drop them on a form with an empty rail
  // instead. See the note on `hasScopedReach`.
  if (!hasScopedReach(scopes, signedIn)) return <NoAccess appName={APP_NAME} />;

  // Safe: hasScopedReach just proved at least one scope-gated screen is here.
  const landing = (reachable.find((s) => !s.public && s.loads !== null) ?? reachable[0]).path;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={landing} replace />} />
        {SCREEN_ROUTES.map((screen) => {
          // `public` screens are routed above this guard, in App(), and their
          // path never reaches here.
          if (screen.public) return null;
          const page = PAGE_BY_KEY[screen.key];
          // No load call: anyone with a session is in.
          if (screen.loads === null) {
            return <Route key={screen.key} path={screen.path} element={page} />;
          }
          // The requirement comes from the contract, through the generated
          // table — never from this file.
          return (
            <Route
              key={screen.key}
              element={<RequireOperation op={screen.loads} screen={screen.label} />}
            >
              <Route path={screen.path} element={page} />
            </Route>
          );
        })}
        {/* ── Forbidden is INSIDE the shell: the rail the caller can use stays. */}
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<Navigate to={landing} replace />} />
      </Route>
    </Routes>
  );
}
