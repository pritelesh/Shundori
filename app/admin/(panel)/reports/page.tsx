import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AnalyticsReportView } from "@/components/admin/analytics-report";
import { guardAdminPage } from "@/services/admin-page-guard";
import { getAnalyticsReport } from "@/services/analytics";

// This page is request-authenticated and uses searchParams and connection().
export const instant = false;

export const metadata: Metadata = {
  title: "Reports",
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await guardAdminPage();
  const params = await searchParams;
  const report = await getAnalyticsReport(
    firstValue(params.from),
    firstValue(params.to),
  );

  return (
    <>
      <AdminPageHeader
        eyebrow="Business"
        title="Reports"
        description="Real sales and inventory aggregates from the local database. Customer identities are never returned."
      />
      <AnalyticsReportView report={report} />
    </>
  );
}
