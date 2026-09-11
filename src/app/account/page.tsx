import { headers } from "next/headers";
import { requireUser, toPrincipal } from "@/lib/page";
import { getProfile } from "@/modules/auth/profile";
import { getPreferences } from "@/modules/notify/service";
import { myCalendarToken } from "@/modules/pm/service";
import { T, userRoleLabel } from "@/lib/vi";
import { AccountProfile } from "@/app/components/account-profile";
import { RegenerateCalendarLink } from "@/app/components/account-calendar";
import { NotificationPrefsForm } from "@/app/components/notification-prefs";

export const metadata = { title: T.account };

// Transitional account settings. Project work starts at /app; this route keeps
// account-specific preferences outside the application workspace.
export default async function AccountPage() {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const [profile, prefs, token, headerList] = await Promise.all([
    getProfile(actor),
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
          initial={{ displayName: profile.displayName }}
        />
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

    </main>
  );
}
