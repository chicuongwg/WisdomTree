import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader, Stack, Surface, translate } from "@/app/components/ui-next";
import { getAppPerson, toApplicationError } from "@/modules/application";
import { getAppRequestContext } from "../../_lib/request-context";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  const { actor, application } = await getAppRequestContext();
  let person: Awaited<ReturnType<typeof getAppPerson>>;
  try {
    person = await getAppPerson(actor, personId);
  } catch (error) {
    if (toApplicationError(error).error === "not_found") notFound();
    throw error;
  }
  return (
    <PageContainer width="standard">
      <Stack>
        <PageHeader title={person.displayName} description={person.summary ?? undefined} />
        <Surface>
          <h2>{translate(application.locale, "people.projects")}</h2>
          <ul>
            {person.projects.map((project) => (
              <li key={project.id}>
                <Link href={`/app/projects/${project.id}`}>{project.name}</Link>
              </li>
            ))}
          </ul>
        </Surface>
        <Surface>
          <h2>{translate(application.locale, "people.activities")}</h2>
          {person.activities.length ? (
            <ul>
              {person.activities.map((activity) => (
                <li key={activity.id}>
                  <Link href={`/app/projects/${activity.project.id}/activities/${activity.id}`}>
                    {activity.title}
                  </Link>
                  {activity.roleLabel ? ` — ${activity.roleLabel}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p>{translate(application.locale, "people.noActivities")}</p>
          )}
        </Surface>
      </Stack>
    </PageContainer>
  );
}
