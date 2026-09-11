import { getAppRequestContext } from "../_lib/request-context";
import { getMyWork } from "@/modules/application";
import { MyWorkView } from "./_components/my-work-view";

export default async function AppMyWorkPage() {
  const { actor, application } = await getAppRequestContext();
  const myWork = await getMyWork(actor);
  return <MyWorkView locale={application.locale} tasks={myWork.assignedTasks} />;
}
