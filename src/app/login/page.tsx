import { redirect } from "next/navigation";
import { currentUser } from "@/modules/auth/session";
import { devLoginEnabled, listSignInCandidates } from "@/modules/auth/dev-auth";
import { T } from "@/lib/vi";
import { LoginPicker } from "../components/login-picker";

// Dev sign-in (demo substitution): user picker over seeded users, one per
// role. V1 replaces this page with Google OIDC.
export default async function LoginPage() {
  if (await currentUser()) redirect("/");

  // The picker lists real user ids, and the route behind it turns any of them
  // into that user's session. Both halves stay shut together: with the gate
  // closed this page must not enumerate the team either.
  if (!devLoginEnabled()) {
    return (
      <main className="page">
        <h1>{T.signIn}</h1>
        <div className="panel">
          <p className="muted">
            Bản cài đặt này chưa bật cách đăng nhập nào. Liên hệ quản trị viên để được cấp quyền
            truy cập.
          </p>
        </div>
      </main>
    );
  }

  const seeded = await listSignInCandidates();
  return (
    <main className="page">
      <h1>{T.signIn}</h1>
      <div className="panel">
        <p className="muted">Bản demo: chọn một thành viên để đăng nhập (thay cho đăng nhập Google).</p>
        <LoginPicker users={seeded} />
      </div>
    </main>
  );
}
