"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { ProductReviewList } from "@/components/products/product-review-list";
import type { ProductReview } from "@/types/phase8";
import { cn } from "@/utils/cn";

type TabId = "description" | "ingredients" | "usage" | "reviews";

export interface ProductDetailsTabsProps {
  description: string;
  benefits?: readonly string[];
  ingredients: readonly string[];
  usageInstructions: readonly string[];
  reviews: readonly ProductReview[];
  /** Optional leave-a-review form, rendered inside the Reviews pane only. */
  reviewForm?: ReactNode;
}

/** Desktop tabs; the same content becomes a native accordion on mobile. */
export function ProductDetailsTabs({
  description,
  benefits = [],
  ingredients,
  usageInstructions,
  reviews,
  reviewForm,
}: ProductDetailsTabsProps) {
  const [active, setActive] = useState<TabId>("description");
  const reviewsDetailsRef = useRef<HTMLDetailsElement>(null);
  const idPrefix = useId();
  const publishedReviews = [...reviews];

  // The rating row links to #reviews. Open that pane on either layout.
  useEffect(() => {
    const revealReviews = () => {
      if (window.location.hash !== "#reviews") return;
      setActive("reviews");
      if (reviewsDetailsRef.current) reviewsDetailsRef.current.open = true;
    };

    revealReviews();
    window.addEventListener("hashchange", revealReviews);
    return () => window.removeEventListener("hashchange", revealReviews);
  }, []);

  const reviewsContent = (
    <div>
      {reviewForm ? <div className="mb-5">{reviewForm}</div> : null}
      <ProductReviewList reviews={publishedReviews} />
    </div>
  );

  const panes: Record<TabId, { label: string; content: ReactNode }> = {
    description: {
      label: "Description",
      content: (
        <div className="max-w-3xl space-y-4">
          <p className="text-sm leading-7 text-ink-soft">
            {description || "No description supplied for this product."}
          </p>
          {benefits.length > 0 ? (
            <ul className="space-y-2">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex gap-2 text-sm leading-6 text-ink-soft">
                  <Check
                    className="mt-1 size-4 shrink-0 text-leaf"
                    aria-hidden="true"
                  />
                  {benefit}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ),
    },
    ingredients: {
      label: "Ingredients",
      content:
        ingredients.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {ingredients.map((ingredient) => (
              <li key={ingredient} className="text-sm leading-6 text-ink-soft">
                {ingredient}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">
            Ingredients are not supplied for this product.
          </p>
        ),
    },
    usage: {
      label: "How to use",
      content:
        usageInstructions.length > 0 ? (
          <ol className="space-y-2">
            {usageInstructions.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-6 text-ink-soft">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sage-light text-xs font-semibold text-forest">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-ink-soft">
            Usage instructions are not supplied for this product.
          </p>
        ),
    },
    reviews: {
      label: `Reviews (${publishedReviews.length})`,
      content: reviewsContent,
    },
  };

  const order: TabId[] = ["description", "ingredients", "usage", "reviews"];

  return (
    <>
      <div className="hidden md:block">
        <div
          role="tablist"
          aria-label="Product details"
          className="flex gap-1 border-b border-sage-light"
        >
          {order.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`${idPrefix}-${id}-tab`}
              aria-selected={active === id}
              aria-controls={`${idPrefix}-${id}-panel`}
              tabIndex={active === id ? 0 : -1}
              onClick={() => setActive(id)}
              className={cn(
                "min-h-12 rounded-t-lg px-4 text-sm font-medium transition-colors",
                active === id
                  ? "border-b-2 border-forest text-forest"
                  : "text-ink-soft hover:text-ink-soft",
              )}
            >
              {panes[id].label}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id={`${idPrefix}-${active}-panel`}
          aria-labelledby={`${idPrefix}-${active}-tab`}
          className="pt-6"
        >
          {panes[active].content}
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {order.map((id) => (
          <details
            key={id}
            ref={id === "reviews" ? reviewsDetailsRef : undefined}
            className="group surface-card rounded-xl"
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-ink-soft marker:hidden">
              {panes[id].label}
              <ChevronDown
                className="size-4 shrink-0 text-ink-soft transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="border-t border-sage-light px-4 py-4">
              {panes[id].content}
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
