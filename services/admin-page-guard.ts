import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getAdminAccess } from "@/services/admin-auth";

/**
 * Page-level redirect guard. The panel layout has the same check, but child
 * pages may render concurrently with a streamed layout, so each page guards
 * itself before calling any privileged data service.
 */
export async function guardAdminPage(): Promise<void> {
  // Pages render concurrently with the streamed layout. Supabase Auth reads
  // the current time while restoring the session, so defer this guard before
  // that happens to keep page prerendering deterministic.
  await connection();
  const access = await getAdminAccess();

  if (access.state === "unauthenticated" || access.state === "unconfigured") {
    redirect("/admin/login");
  }
  if (access.state === "forbidden") {
    redirect("/admin/unauthorized");
  }
}
