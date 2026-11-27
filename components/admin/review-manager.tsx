"use client";

import { Check, EyeOff, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { moderateReviewAction } from "@/app/admin/(panel)/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { PendingReview } from "@/types/phase8";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/format";

export function ReviewManager({ reviews }: { reviews: PendingReview[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"pending" | "approved">("pending");

  const visible = reviews.filter((review) =>
    filter === "pending" ? !review.isApproved : review.isApproved,
  );

  function moderate(id: string, approve: boolean) {
    startTransition(async () => {
      const result = await moderateReviewAction(id, approve);
      if (result.status === "error") {
        toast({ title: "Update failed", description: result.message, variant: "promo" });
        return;
      }
      toast({ title: result.message, variant: "success" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={filter === "pending" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFilter("pending")}
        >
          Pending ({reviews.filter((review) => !review.isApproved).length})
        </Button>
        <Button
          type="button"
          variant={filter === "approved" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFilter("approved")}
        >
          Published ({reviews.filter((review) => review.isApproved).length})
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-warm-line bg-peach/40 p-6 text-sm text-taupe">
          No {filter} reviews.
        </p>
      ) : (
        <div className="space-y-4">
          {visible.map((review) => (
            <article key={review.id} className="rounded-2xl border border-warm-line bg-warm-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-dark-text">
                    {review.productName}
                    <span className="ml-2 text-xs font-normal text-taupe">
                      {review.orderNumber ?? "Order unavailable"}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-taupe">
                    {review.customerName} · {formatDate(review.createdAt)} · Verified purchase
                  </p>
                </div>
                <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      className={cn(
                        "size-4",
                        value <= review.rating ? "fill-chocolate text-chocolate" : "text-dark-text/20",
                      )}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-dark-text">
                {review.body}
              </p>
              <div className="mt-5 flex gap-2">
                {!review.isApproved ? (
                  <Button type="button" size="sm" onClick={() => moderate(review.id, true)} disabled={pending}>
                    <Check className="size-4" aria-hidden="true" />
                    Approve
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => moderate(review.id, false)} disabled={pending}>
                    <EyeOff className="size-4" aria-hidden="true" />
                    Hide
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
