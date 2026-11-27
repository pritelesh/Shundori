"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import {
  sendProductEnquiryAction,
} from "@/app/(storefront)/enquiries/actions";
import {
  initialEnquiryState,
} from "@/app/(storefront)/enquiries/enquiry-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

const textareaClass =
  "w-full rounded-lg border border-warm-line bg-warm-white px-4 py-3 text-sm text-dark-text placeholder:text-taupe/70 transition-colors focus:border-olive-deep focus:outline-none focus:ring-2 focus:ring-olive-deep/15";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-chocolate">{message}</p>;
}

export function ProductEnquiry({ productId }: { productId: string }) {
  const { toast } = useToast();
  const handled = useRef("");
  const [state, action, pending] = useActionState(
    sendProductEnquiryAction,
    initialEnquiryState,
  );

  useEffect(() => {
    if (state.status === "idle" || !state.message) return;
    const marker = `${state.status}:${state.message}`;
    if (handled.current === marker) return;
    handled.current = marker;
    toast({
      title: state.status === "success" ? "Enquiry sent" : "Could not send",
      description: state.message,
      variant: state.status === "success" ? "success" : "promo",
    });
  }, [state, toast]);

  return (
    <details className="group mt-6 rounded-2xl border border-warm-line bg-peach/50 p-5">
      <summary className="cursor-pointer list-none text-sm font-medium text-dark-text marker:hidden">
        Ask us about this product
        <span className="ml-2 text-xs font-normal text-taupe">
          (opens a short form)
        </span>
      </summary>

      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="productId" value={productId} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="enquiryName" className="mb-2 block text-sm font-medium">
              Your name *
            </label>
            <Input
              id="enquiryName"
              name="customerName"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              aria-invalid={Boolean(state.fieldErrors.customerName)}
            />
            <FieldError message={state.fieldErrors.customerName} />
          </div>
          <div>
            <label htmlFor="enquiryPhone" className="mb-2 block text-sm font-medium">
              Phone number *
            </label>
            <Input
              id="enquiryPhone"
              name="customerPhone"
              type="tel"
              required
              minLength={8}
              maxLength={30}
              autoComplete="tel"
              aria-invalid={Boolean(state.fieldErrors.customerPhone)}
            />
            <FieldError message={state.fieldErrors.customerPhone} />
          </div>
        </div>

        <div>
          <label htmlFor="enquiryEmail" className="mb-2 block text-sm font-medium">
            Email (optional)
          </label>
          <Input
            id="enquiryEmail"
            name="customerEmail"
            type="email"
            maxLength={160}
            autoComplete="email"
            aria-invalid={Boolean(state.fieldErrors.customerEmail)}
          />
          <FieldError message={state.fieldErrors.customerEmail} />
        </div>

        <div>
          <label htmlFor="enquiryMessage" className="mb-2 block text-sm font-medium">
            Your question *
          </label>
          <textarea
            id="enquiryMessage"
            name="message"
            rows={4}
            minLength={10}
            maxLength={2000}
            required
            className={textareaClass}
            placeholder="Tell us what you would like to know"
            aria-invalid={Boolean(state.fieldErrors.message)}
          />
          <FieldError message={state.fieldErrors.message} />
        </div>

        <Button type="submit" variant="outline" disabled={pending}>
          <Send className="size-4" aria-hidden="true" />
          {pending ? "Sending…" : "Send enquiry"}
        </Button>
      </form>
    </details>
  );
}
