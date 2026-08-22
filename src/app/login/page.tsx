import { redirect } from "next/navigation";
import { currentUser } from "@/modules/auth/session";
import { oidcEnabled } from "@/modules/auth/oidc";
import { devLoginEnabled, listSignInCandidates } from "@/modules/auth/dev-login";
import { T, userRoleLabel } from "@/lib/vi";

export const metadata = { title: T.signIn };

// Screen: cổng đăng nhập — Google OIDC is the real door. Outside production
// a seeded-member picker sits beneath it so local testing needs no Google
// configuration; the picker and its endpoint do not exist in production.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await currentUser()) redirect("/");
  const { error } = await searchParams;
  const oidc = oidcEnabled();
  const dev = devLoginEnabled();
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

      {dev && seeded.length > 0 && (
        <>
          {oidc && <hr className="login-divider" />}
          <h2 className="meta">{T.demoLoginHeading}</h2>
          {/* Plain form posts — no JS: the route sets the session cookie and
              303s home. One button per seeded member. */}
          <div className="panel">
            {seeded.map((u) => (
              <form key={u.id} method="post" action="/api/auth/dev-login" className="inline">
                <input type="hidden" name="userId" value={u.id} />
                <button type="submit" className="secondary login-person">
                  {u.displayName} · {userRoleLabel(u.role)}
                </button>
              </form>
            ))}
          </div>
        </>
      )}

      {!oidc && !dev && (
        <div className="panel">
          <p className="muted">{T.oidcNotConfigured}</p>
        </div>
      )}
    </main>
  );
}
