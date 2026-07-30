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

export const metadata = { title: T.account };

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
  const initials = profile.displayName.split(/\s+/).filter(Boolean).slice(-1)[0]?.slice(0, 2);

  return (
    <main className="page">
      <h1>{T.account}</h1>

      <div className="panel">
        <h2>{T.profileHeading}</h2>
        <div className="account-head">
          {profile.avatarKey ? (
            /* Served by our own session-guarded route; next/image cannot add anything. */
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
            <p className="muted">{T.roleAssignedNote}</p>
          </div>
        </div>
        <AccountProfile
          initial={{ displayName: profile.displayName, zaloUserId: profile.zaloUserId }}
        />
      </div>

      <div className="panel">
        <h2>{T.mySpacesHeading}</h2>
        {spaces.length === 0 ? (
          <p className="muted">{T.accountNoSpacesHint}</p>
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
          <p className="muted">{T.calendarLinkMissing}</p>
        )}
        <RegenerateCalendarLink />
      </div>

      <div className="panel">
        <h2>{T.mySubmissions}</h2>
        <p>
          <Link href="/source/mine">{T.viewMySubmissions}</Link>
        </p>
      </div>
    </main>
  );
}
