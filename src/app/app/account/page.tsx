import { headers } from "next/headers";
import { AccountProfile } from "@/app/components/account-profile";
import { RegenerateCalendarLink } from "@/app/components/account-calendar";
import { NotificationPrefsForm } from "@/app/components/notification-prefs";
import { PageContainer, PageHeader, Stack, Surface, translate } from "../../components/ui-next";
import { getPreferences } from "@/modules/notify/service";
import { myCalendarToken } from "@/modules/pm/service";
import { getProfile } from "@/modules/auth/profile";
import { listAppMySubmissions } from "@/modules/application";
import { getAppRequestContext } from "../_lib/request-context";

const roleMessage = {
  user: "account.role.user",
  editor: "account.role.editor",
  admin_op: "account.role.admin_op",
} as const;

export default async function AppAccountPage() {
  const { actor, application } = await getAppRequestContext();
  const [profile, prefs, token, submissions, headerList] = await Promise.all([
    getProfile(actor),
    getPreferences(actor),
    myCalendarToken(actor),
    listAppMySubmissions(actor),
    headers(),
  ]);
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const initials = profile.displayName.split(/\s+/).filter(Boolean).slice(-1)[0]?.slice(0, 2);

  return (
    <PageContainer width="standard">
      <Stack className="ui-next-account-settings space-y-6">
        <PageHeader title={translate(application.locale, "shell.account")} />

        <section aria-labelledby="account-profile-title">
          <Surface className="grid gap-4">
            <h2 id="account-profile-title" className="m-0 text-lg font-bold">
              {translate(application.locale, "account.profile")}
            </h2>
            <div className="ui-next-account-settings__profile flex items-center max-md:items-start gap-4">
              {profile.avatarKey ? (
                <img
                  className="ui-next-account-settings__avatar size-[4.5rem] grid place-items-center shrink-0 overflow-hidden rounded-full bg-ui-accent text-white font-bold object-cover"
                  src={`/api/avatar/${profile.id}?v=${encodeURIComponent(profile.avatarKey)}`}
                  alt=""
                />
              ) : (
                <span
                  className="ui-next-account-settings__avatar size-[4.5rem] grid place-items-center shrink-0 overflow-hidden rounded-full bg-ui-accent text-white font-bold text-xl"
                  aria-hidden="true"
                >
                  {initials}
                </span>
              )}
              <div className="min-w-0 break-words">
                <p className="ui-next-account-settings__name m-0 text-lg font-bold">
                  {profile.displayName}
                </p>
                <p className="ui-next-muted mt-1 text-sm text-ui-text-muted">
                  {profile.email} · {translate(application.locale, roleMessage[profile.role])}
                </p>
                <p className="ui-next-muted mt-0.5 text-xs text-ui-text-muted">
                  {translate(application.locale, "account.roleAssigned")}
                </p>
              </div>
            </div>
            <AccountProfile initial={{ displayName: profile.displayName }} />
          </Surface>
        </section>

        <section aria-labelledby="account-notifications-title">
          <Surface className="grid gap-4">
            <h2 id="account-notifications-title" className="m-0 text-lg font-bold">
              {translate(application.locale, "account.notifications")}
            </h2>
            <NotificationPrefsForm initial={prefs} />
          </Surface>
        </section>

        <section aria-labelledby="account-calendar-title">
          <Surface className="grid gap-4">
            <h2 id="account-calendar-title" className="m-0 text-lg font-bold">
              {translate(application.locale, "account.calendar")}
            </h2>
            {token ? (
              <>
                <p className="ui-next-muted m-0 text-sm text-ui-text-muted">
                  {translate(application.locale, "account.calendarHint")}
                </p>
                <code className="ui-next-account-settings__calendar-link block max-w-full overflow-x-auto border border-ui-border rounded p-3 bg-ui-surface-sunken font-mono text-sm">{`${proto}://${host}/calendar/${token.token}.ics`}</code>
              </>
            ) : (
              <p className="ui-next-muted m-0 text-sm text-ui-text-muted">
                {translate(application.locale, "account.calendarMissing")}
              </p>
            )}
            <RegenerateCalendarLink />
          </Surface>
        </section>

        <section aria-labelledby="account-submissions-title">
          <Surface className="grid gap-4">
            <h2 id="account-submissions-title" className="m-0 text-lg font-bold">
              {translate(application.locale, "materials.mySubmissions")}
            </h2>
            {submissions.length ? (
              <ul className="space-y-2 list-disc pl-5">
                {submissions.map((submission) => (
                  <li key={submission.id}>
                    <a
                      href={`/app/projects/${encodeURIComponent(submission.projectId)}/materials/${encodeURIComponent(submission.id)}`}
                      className="text-ui-accent underline-offset-[0.18em] hover:underline"
                    >
                      {submission.title}
                    </a>
                    <span className="ui-next-muted text-sm text-ui-text-muted">
                      {" "}
                      · {submission.projectName}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ui-next-muted m-0 text-sm text-ui-text-muted">
                {translate(application.locale, "materials.mySubmissionsEmpty")}
              </p>
            )}
          </Surface>
        </section>
      </Stack>
    </PageContainer>
  );
}
