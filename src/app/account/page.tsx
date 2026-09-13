import { redirect } from "next/navigation";

/** The retained account capability now uses the single target app shell. */
export default function AccountPage() {
  redirect("/app/account");
}
