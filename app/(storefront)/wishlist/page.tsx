import type { Metadata } from "next";
import { Suspense } from "react";

import { getWishlistProductsAction } from "@/app/(storefront)/wishlist/actions";
import { WishlistClient } from "@/components/wishlist/wishlist-client";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Products you have saved at Shundori.",
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return (
    <>
      <PageHeader
        eyebrow="Your edit"
        title="Wishlist"
        description="Saved items stay on this device for guests, or follow your account when you sign in."
      />
      <Container className="py-12 sm:py-16">
        <Suspense
          fallback={
            <p className="py-20 text-center text-sm text-taupe">
              Loading wishlist…
            </p>
          }
        >
          <WishlistClient getProductsAction={getWishlistProductsAction} />
        </Suspense>
      </Container>
    </>
  );
}
