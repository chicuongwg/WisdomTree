import { redirect } from "next/navigation";

/** Legacy Graph links now enter the single target application shell. */
export default function GraphPage() {
  redirect("/app/graph");
}
