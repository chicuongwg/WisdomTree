import Link from "next/link";
import { PageContainer, PageHeader, Stack, translate } from "@/app/components/ui-next";
import { APP_NOTIFICATION_LIMIT, listAppNotifications } from "@/modules/application";
import { getAppRequestContext } from "../_lib/request-context";
import { NotificationCenter } from "./_components/notification-center";

export default async function AppNotificationsPage() {
  const { actor, application } = await getAppRequestContext();
  const notifications = await listAppNotifications(actor);
  return (
    <PageContainer width="standard">
      <Stack>
        <PageHeader title={translate(application.locale, "notifications.title")} />
        <NotificationCenter
          locale={application.locale}
          notifications={notifications}
          truncated={notifications.length >= APP_NOTIFICATION_LIMIT}
        />
        <Link className="ui-next-notification-preferences" href="/app/account">
          {translate(application.locale, "notifications.preferences")}
        </Link>
      </Stack>
    </PageContainer>
  );
}
