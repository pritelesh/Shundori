"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";

import { updateDeliveryChargeAction } from "@/app/admin/(panel)/actions";
import type { AdminMutationState } from "@/app/admin/(panel)/mutation-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

const INITIAL_STATE: AdminMutationState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

function toTakaInput(poisha: number): string {
  const taka = poisha / 100;
  return Number.isInteger(taka) ? String(taka) : taka.toFixed(2);
}

export function DeliveryChargeForm({ poisha }: { poisha: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const handledRef = useRef("");
  const [state, action, pending] = useActionState(
    updateDeliveryChargeAction,
    INITIAL_STATE,
  );

  useEffect(() => {
    if (state.status === "idle" || !state.message) return;
    const marker = `${state.status}:${state.message}`;
    if (handledRef.current === marker) return;
    handledRef.current = marker;

    toast({
      title: state.status === "success" ? "Settings saved" : "Could not save",
      description: state.message,
      variant: state.status === "success" ? "success" : "promo",
    });
    if (state.status === "success") router.refresh();
  }, [state, router, toast]);

  return (
    <form action={action} className="max-w-md">
      <label htmlFor="deliveryCharge" className="mb-2 block text-sm font-medium">
        Delivery charge (BDT)
      </label>
      <div className="flex flex-wrap gap-3">
        <Input
          id="deliveryCharge"
          name="deliveryCharge"
          type="number"
          min="0"
          max="10000"
          step="0.01"
          defaultValue={toTakaInput(poisha)}
          aria-invalid={Boolean(state.fieldErrors.deliveryCharge)}
          aria-describedby="deliveryCharge-help"
          required
        />
        <Button type="submit" disabled={pending}>
          <Save className="size-4" aria-hidden="true" />
          {pending ? "Saving…" : "Save charge"}
        </Button>
      </div>
      <p id="deliveryCharge-help" className="mt-2 text-xs leading-5 text-ink-soft">
        Applies to every new checkout order. Stored internally as integer poisha.
      </p>
      {state.fieldErrors.deliveryCharge ? (
        <p className="mt-1.5 text-xs text-forest">
          {state.fieldErrors.deliveryCharge}
        </p>
      ) : null}
    </form>
  );
}
