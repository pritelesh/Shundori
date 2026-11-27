import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ReviewManager } from "@/components/admin/review-manager";
import { guardAdminPage } from "@/services/admin-page-guard";
import { listAdminReviews } from "@/services/reviews";

export const instant = false;

export const metadata: Metadata = {
  title: "Reviews",
  robots: { index: false, follow: false },
};

export default async function AdminReviewsPage() {
  await guardAdminPage();
  const reviews = await listAdminReviews();

  return (
    <>
      <AdminPageHeader
        eyebrow="Customers"
        title="Product reviews"
        description="Approve or hide reviews submitted by verified purchasers. Only published reviews appear on product pages."
      />
      <ReviewManager reviews={reviews} />
    </>
  );
}
