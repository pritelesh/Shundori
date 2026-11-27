"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  getReviewEligibilityAction,
  submitReviewAction,
} from "@/app/(storefront)/product/[slug]/actions";
import {
  initialReviewState,
  type ReviewMutationState,
} from "@/app/(storefront)/product/[slug]/review-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { EligibleReviewItem } from "@/types/phase8";
import { cn } from "@/utils/cn";

export function ReviewForm({
  productId,
  productSlug,
}: {
  productId: string;
  productSlug: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [selectedOrderItemId, setSelectedOrderItemId] = useState("");
  const [items, setItems] = useState<EligibleReviewItem[]>([]);
  const [state, formAction, pending] = useActionState<ReviewMutationState, FormData>(
    submitReviewAction.bind(null, productSlug),
    initialReviewState,
  );

  useEffect(() => {
    let active = true;
    getReviewEligibilityAction(productId)
      .then((eligible) => {
        if (active) setItems(eligible);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, [productId, state.status]);

  useEffect(() => {
    if (state.status === "success") {
      toast({ title: "Review submitted", description: state.message, variant: "success" });
      router.refresh();
    } else if (state.status === "error" && state.message) {
      toast({ title: "Could not submit review", description: state.message, variant: "promo" });
    }
  }, [state, router, toast]);

  if (items.length === 0) return null;

  return (
    <form action={formAction} className="rounded-2xl border border-warm-line bg-warm-white p-6">
      <h3 className="font-display text-xl text-dark-text">Write a review</h3>
      <p className="mt-1 text-xs text-taupe">
        Only verified purchases of this product can post a review. New reviews are moderated before publication.
      </p>

      <input type="hidden" name="productId" value={productId} />

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="orderItemId" className="mb-2 block text-sm font-medium">
            Purchased order *
          </label>
          <select
            id="orderItemId"
            name="orderItemId"
            required
            value={selectedOrderItemId}
            onChange={(event) => setSelectedOrderItemId(event.target.value)}
            className="h-11 w-full rounded-lg border border-warm-line bg-warm-white px-4 text-sm"
          >
            <option value="">Choose a delivered order</option>
            {items.map((item) => (
              <option key={item.orderItemId} value={item.orderItemId}>
                {item.orderNumber} — {item.productName}
              </option>
            ))}
          </select>
        </div>

        <input
          type="hidden"
          name="orderId"
          value={items.find((item) => item.orderItemId === selectedOrderItemId)?.orderId ?? ""}
        />

        <div className="sm:col-span-2">
          <span className="mb-2 block text-sm font-medium">Star rating *</span>
          <div className="flex gap-1" role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} star${value === 1 ? "" : "s"}`}
                onClick={() => setRating(value)}
                className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-deep"
              >
                <Star
                  className={cn(
                    "size-6",
                    value <= rating
                      ? "fill-chocolate text-chocolate"
                      : "text-dark-text/25",
                  )}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
          <input type="hidden" name="rating" value={rating} />
          {state.fieldErrors.rating ? (
            <p className="mt-1.5 text-xs text-chocolate">{state.fieldErrors.rating}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="body" className="mb-2 block text-sm font-medium">
            Your review *
          </label>
          <textarea
            id="body"
            name="body"
            rows={5}
            minLength={10}
            maxLength={2000}
            required
            placeholder="What did you like? How did the product work for you?"
            className="w-full rounded-lg border border-warm-line bg-warm-white px-4 py-3 text-sm focus:border-olive-deep focus:outline-none focus:ring-2 focus:ring-olive-deep/15"
            aria-invalid={Boolean(state.fieldErrors.body)}
          />
          {state.fieldErrors.body ? (
            <p className="mt-1.5 text-xs text-chocolate">{state.fieldErrors.body}</p>
          ) : null}
        </div>
      </div>

      <Button type="submit" disabled={pending} className="mt-5">
        {pending ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}
