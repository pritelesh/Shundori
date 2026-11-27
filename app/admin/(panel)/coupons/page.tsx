import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CouponManager } from "@/components/admin/coupon-manager";
import { guardAdminPage } from "@/services/admin-page-guard";
import { listAdminCoupons } from "@/services/coupons";

// Request-authenticated admin page; connection() is awaited in the guard.
export const instant = false;

export const metadata: Metadata = {
  title: "Coupons",
  robots: { index: false, follow: false },
};

export default async function AdminCouponsPage() {
  await guardAdminPage();
  const coupons = await listAdminCoupons();

  return (
    <>
      <AdminPageHeader
        eyebrow="Promotions"
        title="Coupons"
        description="Create percentage or fixed-amount coupons with minimum spend, expiry dates and usage limits. Every code is revalidated when an order is placed."
      />
      <CouponManager coupons={coupons} />
    </>
  );
}
