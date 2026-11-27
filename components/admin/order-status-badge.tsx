import { Badge, type BadgeVariant } from "@/components/ui/badge";
import type { CancellationStatus, OrderStatus } from "@/types/order";

const statusVariants: Record<OrderStatus, BadgeVariant> = {
  pending: "pinkSoft",
  confirmed: "emeraldSoft",
  processing: "outline",
  shipped: "neutral",
  delivered: "emerald",
  cancelled: "pink",
  returned: "neutral",
};

const cancellationVariants: Record<CancellationStatus, BadgeVariant> = {
  none: "neutral",
  requested: "pinkSoft",
  approved: "pink",
  rejected: "emeraldSoft",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={statusVariants[status]}>{status}</Badge>;
}

export function CancellationStatusBadge({
  status,
}: {
  status: CancellationStatus;
}) {
  return <Badge variant={cancellationVariants[status]}>{status}</Badge>;
}
