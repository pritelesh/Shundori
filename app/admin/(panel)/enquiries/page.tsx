import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EnquiryManager } from "@/components/admin/enquiry-manager";
import { guardAdminPage } from "@/services/admin-page-guard";
import { listAdminEnquiries } from "@/services/enquiries";

// This page is request-authenticated and uses connection() in its guard.
export const instant = false;

export const metadata: Metadata = {
  title: "Enquiries",
  robots: { index: false, follow: false },
};

export default async function AdminEnquiriesPage() {
  await guardAdminPage();
  const enquiries = await listAdminEnquiries();

  return (
    <>
      <AdminPageHeader
        eyebrow="Customer care"
        title="Enquiries"
        description="Product and order questions submitted by customers. Internal notes are never shown on the storefront."
      />
      <EnquiryManager enquiries={enquiries} />
    </>
  );
}
