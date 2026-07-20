import { redirect } from "next/navigation";
import { currentUser } from "@/modules/auth/session";
import { devLoginEnabled, listSignInCandidates } from "@/modules/auth/dev-auth";
import { oidcEnabled } from "@/modules/auth/oidc";
import { T } from "@/lib/vi";
import { LoginPicker } from "../components/login-picker";

// Screen: cổng đăng nhập. Google OIDC is the real door when configured; the
// dev picker survives beneath it as the demo's quick sign-in. The layout's
// signed-out branch already provides the plain-shell topbar around this page.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await currentUser()) redirect("/");
  const { error } = await searchParams;
  const oidc = oidcEnabled();
  const dev = devLoginEnabled();

  // The picker lists real user ids, and the route behind it turns any of them
  // into that user's session. Both halves stay shut together: with the gate
  // closed this page must not enumerate the team either.
  const seeded = dev ? await listSignInCandidates() : [];

  return (
    <main className="page login-page">
      <div className="login-hero">
        <span className="brand-mark login-seal" aria-hidden="true">
          WT
        </span>
        <h1 className="login-title">{T.appName}</h1>
        {/* Same string as the layout's metadata description */}
        <p className="muted">{T.loginTagline}</p>
      </div>

      {error === "not_invited" && (
        <p className="notice" role="alert">
          {T.loginNotInvited}
        </p>
      )}
      {error === "oidc_failed" && (
        <p className="notice" role="alert">
          {T.loginFailed}
        </p>
      )}

      {oidc && (
        <a className="button" href="/api/auth/oidc/start">
          {T.signInWithGoogle}
        </a>
      )}

      {dev && (
        <>
          <hr className="login-divider" />
          {/* The heading is the whole explanation — a second sentence
              restating it was chrome. */}
          <h2 className="muted login-demo-head">{T.loginDemoHeading}</h2>
          <LoginPicker users={seeded} />
        </>
      )}

      {!oidc && !dev && (
        <div className="panel">
          <p className="muted">
            Bản cài đặt này chưa bật cách đăng nhập nào. Liên hệ quản trị viên để được cấp quyền
            truy cập.
          </p>
        </div>
      )}
    </main>
  );
}
