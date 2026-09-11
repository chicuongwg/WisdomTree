import { getAppRequestContext } from "../_lib/request-context";
import { searchAppPeople } from "@/modules/application";
import { PeopleDirectory } from "./_components/people-directory";

export default async function AppPeoplePage() {
  const { actor, application } = await getAppRequestContext();
  const people = await searchAppPeople(actor);
  return <PeopleDirectory locale={application.locale} people={people} />;
}
