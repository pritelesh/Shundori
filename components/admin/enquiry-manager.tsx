"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";

import { updateEnquiryAction } from "@/app/admin/(panel)/actions";
import { initialMutationState } from "@/app/admin/(panel)/mutation-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { Enquiry } from "@/types/phase8";
import { formatDateTime } from "@/utils/format";

const selectClass =
  "h-11 w-full rounded-lg border border-sage-light bg-cream px-4 text-sm text-ink-soft transition-colors focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/15";
const textareaClass =
  "w-full rounded-lg border border-sage-light bg-cream px-4 py-3 text-sm text-ink-soft placeholder:text-ink-soft transition-colors focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/15";

function EnquiryRow({ enquiry }: { enquiry: Enquiry }) {
  const router = useRouter();
  const { toast } = useToast();
  const handled = useRef("");
  const action = updateEnquiryAction.bind(null, enquiry.id);
  const [state, formAction, pending] = useActionState(
    action,
    initialMutationState,
  );

  useEffect(() => {
    if (state.status === "idle" || !state.message) return;
    const marker = `${state.status}:${state.message}`;
    if (handled.current === marker) return;
    handled.current = marker;
    toast({
      title: state.status === "success" ? "Enquiry updated" : "Could not save",
      description: state.message,
      variant: state.status === "success" ? "success" : "promo",
    });
    if (state.status === "success") router.refresh();
  }, [state, router, toast]);

  return (
    <article className="surface-card rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sage-light px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
              {enquiry.source}
            </span>
            <span className="text-xs text-ink-soft">
              {formatDateTime(enquiry.createdAt)}
            </span>
          </div>
          <h2 className="mt-2 font-medium text-ink-soft">
            {enquiry.customerName}
          </h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            {enquiry.customerPhone}
            {enquiry.customerEmail ? ` · ${enquiry.customerEmail}` : ""}
          </p>
        </div>
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-leaf">
          {enquiry.status}
        </span>
      </div>

      <p className="mt-4 whitespace-pre-wrap rounded-xl border border-sage-light bg-cream p-4 text-sm leading-6 text-ink-soft shadow-soft">
        {enquiry.message}
      </p>

      <form action={formAction} className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`status-${enquiry.id}`}
            className="mb-2 block text-sm font-medium"
          >
            Status
          </label>
          <select
            id={`status-${enquiry.id}`}
            name="status"
            defaultValue={enquiry.status}
            className={selectClass}
          >
            <option value="new">New</option>
            <option value="replied">Replied</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor={`note-${enquiry.id}`}
            className="mb-2 block text-sm font-medium"
          >
            Internal note
          </label>
          <textarea
            id={`note-${enquiry.id}`}
            name="adminNote"
            rows={2}
            maxLength={1000}
            defaultValue={enquiry.adminNote ?? ""}
            className={textareaClass}
            placeholder="Only staff can see this note"
          />
          {state.fieldErrors.status || state.fieldErrors.adminNote ? (
            <p className="mt-1.5 text-xs text-forest">
              {state.fieldErrors.status ?? state.fieldErrors.adminNote}
            </p>
          ) : null}
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            <Save className="size-4" aria-hidden="true" />
            {pending ? "Saving…" : "Save enquiry"}
          </Button>
        </div>
      </form>
    </article>
  );
}

export function EnquiryManager({ enquiries }: { enquiries: Enquiry[] }) {
  if (enquiries.length === 0) {
    return (
      <div className="surface-card rounded-2xl p-10 text-center">
        <p className="text-sm text-ink-soft">No enquiries yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {enquiries.map((enquiry) => (
        <EnquiryRow key={enquiry.id} enquiry={enquiry} />
      ))}
    </div>
  );
}
