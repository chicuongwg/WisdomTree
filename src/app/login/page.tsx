import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/modules/auth/schema";
import { isNull } from "drizzle-orm";
import { currentUser } from "@/modules/auth/session";
import { T } from "@/lib/vi";
import { LoginPicker } from "../components/login-picker";

// Dev sign-in (demo substitution): user picker over seeded users, one per
// role. V1 replaces this page with Google OIDC.
export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  const seeded = await db
    .select({ id: users.id, displayName: users.displayName, role: users.role })
    .from(users)
    .where(isNull(users.disabledAt))
    .orderBy(users.role);
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
