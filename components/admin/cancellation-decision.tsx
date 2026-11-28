"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";

import { decideOrderCancellationAction } from "@/app/admin/(panel)/actions";
import {
  initialMutationState,
  type AdminMutationState,
} from "@/app/admin/(panel)/mutation-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface Props {
  orderId: string;
  approve: boolean;
}

export function CancellationDecision({ orderId, approve }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const handledRef = useRef("");
  const [state, action, pending] = useActionState<AdminMutationState, FormData>(
    decideOrderCancellationAction.bind(null, orderId, approve),
    initialMutationState,
  );

  useEffect(() => {
    if (state.status === "idle" || !state.message) return;
    const marker = `${state.status}:${state.message}`;
    if (handledRef.current === marker) return;
    handledRef.current = marker;

    toast({
      title: state.status === "success" ? "Decision saved" : "Could not save decision",
      description: state.message,
      variant: state.status === "success" ? "success" : "promo",
    });
    if (state.status === "success") router.refresh();
  }, [state, router, toast]);

  const label = approve ? "Approve cancellation" : "Reject request";
  const fieldId = `cancel-note-${approve ? "approve" : "reject"}`;

  return (
    <form action={action} className="surface-card rounded-xl p-4">
      <label
        htmlFor={fieldId}
        className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-ink-soft"
      >
        Decision note (optional)
      </label>
      <textarea
        id={fieldId}
        name="note"
        rows={2}
        maxLength={500}
        className="w-full rounded-lg border border-sage-light bg-cream px-3 py-2 text-sm text-ink-soft placeholder:text-ink-soft focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/15"
        placeholder="Add a short note for the audit trail"
      />
      <div className="mt-3">
        <Button
          type="submit"
          variant={approve ? "primary" : "destructive"}
          size="sm"
          disabled={pending}
        >
          {approve ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <X className="size-4" aria-hidden="true" />
          )}
          {pending ? "Saving…" : label}
        </Button>
      </div>
    </form>
  );
}
