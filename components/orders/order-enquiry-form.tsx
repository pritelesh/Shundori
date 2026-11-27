"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import {
  sendOrderEnquiryAction,
} from "@/app/(storefront)/enquiries/actions";
import {
  initialEnquiryState,
} from "@/app/(storefront)/enquiries/enquiry-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

const textareaClass =
  "w-full rounded-lg border border-line bg-white px-4 py-3 text-sm text-charcoal placeholder:text-muted/70 transition-colors focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/15";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-pink">{message}</p>;
}

export function OrderEnquiryForm({
  orderNumber,
  phone,
}: {
  orderNumber: string;
  phone: string;
}) {
  const { toast } = useToast();
  const handled = useRef("");
  const [state, action, pending] = useActionState(
    sendOrderEnquiryAction,
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
    <details className="group mt-6 rounded-2xl border border-line bg-cream/50 p-5">
      <summary className="cursor-pointer list-none text-sm font-medium text-charcoal marker:hidden">
        Ask about this order
        <span className="ml-2 text-xs font-normal text-muted">
          (opens a short form)
        </span>
      </summary>

      <form action={action} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="enquiryOrderNumber" className="mb-2 block text-sm font-medium">
              Order number *
            </label>
            <Input
              id="enquiryOrderNumber"
              name="orderNumber"
              required
              maxLength={40}
              defaultValue={orderNumber}
              aria-invalid={Boolean(state.fieldErrors.orderNumber)}
            />
            <FieldError message={state.fieldErrors.orderNumber} />
          </div>
          <div>
            <label htmlFor="enquiryOrderPhone" className="mb-2 block text-sm font-medium">
              Phone number on the order *
            </label>
            <Input
              id="enquiryOrderPhone"
              name="customerPhone"
              type="tel"
              required
              minLength={8}
              maxLength={30}
              defaultValue={phone}
              aria-invalid={Boolean(state.fieldErrors.customerPhone)}
            />
            <FieldError message={state.fieldErrors.customerPhone} />
          </div>
        </div>

        <div>
          <label htmlFor="enquiryOrderMessage" className="mb-2 block text-sm font-medium">
            Your question *
          </label>
          <textarea
            id="enquiryOrderMessage"
            name="message"
            rows={4}
            minLength={10}
            maxLength={2000}
            required
            className={textareaClass}
            placeholder="Tell us what you would like to know about this order"
            aria-invalid={Boolean(state.fieldErrors.message)}
          />
          <FieldError message={state.fieldErrors.message} />
        </div>

        <Button type="submit" variant="outline" disabled={pending}>
          <Send className="size-4" aria-hidden="true" />
          {pending ? "Sending…" : "Send enquiry"}
        </Button>
        <p className="text-xs leading-5 text-muted">
          We verify the order number and phone together. Nothing from another
          customer&apos;s order is shown or returned.
        </p>
      </form>
    </details>
  );
}
