"use server";

import { revalidatePath } from "next/cache";

import type { ReviewMutationState } from "@/app/(storefront)/product/[slug]/review-state";
import {
  errorMessage,
  fieldErrorsOf,
  readInteger,
  readString,
  ValidationError,
} from "@/lib/admin-validation";
import { getEligibleReviewItems, submitProductReview } from "@/services/reviews";
import type { EligibleReviewItem } from "@/types/phase8";

/**
 * Eligibility depends on the signed-in customer's delivered orders. Product
 * pages are prerendered, so load this through a Server Action instead of
 * baking one visitor's session into the cached page HTML.
 */
export async function getReviewEligibilityAction(
  productId: string,
): Promise<EligibleReviewItem[]> {
  return getEligibleReviewItems(productId);
}

export async function submitReviewAction(
  productSlug: string,
  _previous: ReviewMutationState,
  formData: FormData,
): Promise<ReviewMutationState> {
  try {
    const productId = readString(formData, "productId");
    const orderId = readString(formData, "orderId");
    const orderItemId = readString(formData, "orderItemId");
    const rating = readInteger(formData, "rating");

    if (!productId || !orderId || !orderItemId || rating === null) {
      throw new ValidationError({
        review: "Select a purchase and star rating before submitting.",
      });
    }

    await submitProductReview({
      productId,
      orderId,
      orderItemId,
      rating,
      body: readString(formData, "body", 2000),
    });

    revalidatePath(`/product/${productSlug}`);
    revalidatePath("/admin/reviews");

    return {
      status: "success",
      message: "Thanks — your review is waiting for moderation.",
      fieldErrors: {},
    };
  } catch (error) {
    return {
      status: "error",
      message: errorMessage(error),
      fieldErrors: fieldErrorsOf(error),
    };
  }
}
