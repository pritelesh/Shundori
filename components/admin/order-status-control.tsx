"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { updateOrderStatusAction } from "@/app/admin/(panel)/actions";
import { useToast } from "@/components/ui/toast";
import { getAllowedOrderStatuses } from "@/lib/order-status";
import type { CancellationStatus, OrderStatus } from "@/types/order";

export function OrderStatusControl({
  id,
  status,
  cancellationStatus,
}: {
  id: string;
  status: OrderStatus;
  cancellationStatus: CancellationStatus;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const allowedStatuses = getAllowedOrderStatuses(status);
  const options: OrderStatus[] = [status, ...allowedStatuses];
  const decisionRequired = cancellationStatus === "requested";

  return (
    <select
      value={status}
      disabled={pending || decisionRequired || allowedStatuses.length === 0}
      title={
        decisionRequired
          ? "Decide the cancellation request before changing the status."
          : undefined
      }
      onChange={(event) => {
        const next = event.target.value as OrderStatus;
        startTransition(async () => {
          const result = await updateOrderStatusAction(id, next);
          if (result.status === "error") {
            toast({ title: "Update failed", description: result.message, variant: "promo" });
            return;
          }
          toast({ title: result.message, variant: "success" });
          router.refresh();
        });
      }}
      className="h-9 rounded-lg border border-line bg-white px-2 text-xs capitalize disabled:opacity-50"
      aria-label="Order status"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
