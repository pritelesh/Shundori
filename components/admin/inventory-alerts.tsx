"use client";

import { Check, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { resolveInventoryAlertAction } from "@/app/admin/(panel)/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { InventoryAlert } from "@/types/phase8";
import { formatDateTime } from "@/utils/format";

export function InventoryAlerts({ alerts }: { alerts: InventoryAlert[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white p-8 text-center">
        <p className="text-sm text-muted">
          No open stock alerts. Thresholds are set on each product.
        </p>
      </div>
    );
  }

  function resolve(id: string) {
    setPendingId(id);
    resolveInventoryAlertAction(id)
      .then((state) => {
        toast({
          title: state.status === "success" ? "Alert resolved" : "Could not resolve",
          description: state.message,
          variant: state.status === "success" ? "success" : "promo",
        });
        if (state.status === "success") {
          startTransition(() => router.refresh());
        }
      })
      .catch(() => {
        toast({
          title: "Could not resolve",
          description: "Please try again.",
          variant: "promo",
        });
      })
      .finally(() => setPendingId(null));
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <article
          key={alert.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5"
        >
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pink-tint">
              <TriangleAlert className="size-4 text-pink" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium text-charcoal">{alert.productName}</p>
              <p className="mt-0.5 text-xs text-muted">
                {alert.alertType === "out_of_stock"
                  ? "Out of stock"
                  : `Low stock · threshold ${alert.thresholdSnapshot}`}
                {alert.sku ? ` · ${alert.sku}` : ""}
                {" · "}
                {formatDateTime(alert.createdAt)}
              </p>
              <p className="mt-1 text-xs text-muted">
                Current stock: {alert.currentStock}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pendingId === alert.id}
            onClick={() => resolve(alert.id)}
          >
            <Check className="size-4" aria-hidden="true" />
            {pendingId === alert.id ? "Resolving…" : "Resolve"}
          </Button>
        </article>
      ))}
    </div>
  );
}
