import Link from "next/link";
import { headers } from "next/headers";
import { requireUser, toPrincipal } from "@/lib/page";
import { getProfile } from "@/modules/auth/profile";
import { getPreferences } from "@/modules/notify/service";
import { myCalendarToken } from "@/modules/pm/service";
import { listMemberSpaces } from "@/modules/storage/service";
import { T, userRoleLabel } from "@/lib/vi";
import { AccountProfile } from "@/app/components/account-profile";
import { RegenerateCalendarLink } from "@/app/components/account-calendar";
import { NotificationPrefsForm } from "@/app/components/notification-prefs";

// Screen: Account (`/account`) — the one place a member's own settings live:
// profile (name, picture, Zalo id), the spaces they belong to, notification
// channels (moved here from /notifications), the calendar link (moved here
// from /deadlines) and a pointer to their submissions. One home per setting.
export default async function AccountPage() {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const [profile, spaces, prefs, token, headerList] = await Promise.all([
    getProfile(actor),
    listMemberSpaces(actor),
    getPreferences(actor),
    myCalendarToken(actor),
    headers(),
  ]);
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";

  // Same last-word initials as the rail, for the member who has no picture.
  const initials = profile.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-1)[0]
    ?.slice(0, 2);

  return (
    <main className="page">
      {/* TODO(vi): move to src/lib/vi.ts */}
      <h1>Tài khoản</h1>

      <div className="panel">
        {/* TODO(vi): move to src/lib/vi.ts */}
        <h2>Hồ sơ</h2>
        <div className="account-head">
          {profile.avatarKey ? (
            /* eslint-disable-next-line @next/next/no-img-element -- served by
               our own session-guarded route; next/image cannot add anything */
            <img
              className="account-avatar"
              src={`/api/avatar/${profile.id}?v=${encodeURIComponent(profile.avatarKey)}`}
              alt=""
            />
          ) : (
            <span className="account-avatar" aria-hidden="true">
              {initials}
            </span>
          )}
          <div>
            <p className="account-name">{profile.displayName}</p>
            <p className="muted">
              {profile.email} · {userRoleLabel(profile.role)}
            </p>
            {/* TODO(vi): move to src/lib/vi.ts */}
            <p className="muted">Vai trò do quản trị viên phân.</p>
          </div>
        </div>
        <AccountProfile
          initial={{ displayName: profile.displayName, zaloUserId: profile.zaloUserId }}
        />
      </div>

      <div className="panel">
        {/* TODO(vi): move to src/lib/vi.ts */}
        <h2>Kho của tôi</h2>
        {spaces.length === 0 ? (
          // TODO(vi): move to src/lib/vi.ts
          <p className="muted">Bạn chưa thuộc kho nào. Quản trị viên sẽ thêm bạn vào kho của nhóm.</p>
        ) : (
          <ul>
            {spaces.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel">
        <h2>{T.notificationPrefs}</h2>
        <NotificationPrefsForm initial={prefs} />
      </div>

      <div className="panel">
        <h2>{T.myCalendar}</h2>
        {token ? (
          <>
            <p className="meta">{T.calendarSubscribeHint}</p>
            <code className="ics-url">{`${proto}://${host}/calendar/${token.token}.ics`}</code>
          </>
        ) : (
          // TODO(vi): move to src/lib/vi.ts
          <p className="muted">Chưa có đường dẫn lịch cho tài khoản này. Bấm nút dưới để tạo.</p>
        )}
        <RegenerateCalendarLink />
      </div>

      <div className="panel">
        <h2>{T.mySubmissions}</h2>
        <p>
          {/* TODO(vi): move to src/lib/vi.ts */}
          <Link href="/source/mine">Xem tư liệu tôi đã gửi →</Link>
        </p>
      </div>
    </main>
  );
}
