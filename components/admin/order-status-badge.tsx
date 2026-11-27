import { Badge, type BadgeVariant } from "@/components/ui/badge";
import type { CancellationStatus, OrderStatus } from "@/types/order";

const statusVariants: Record<OrderStatus, BadgeVariant> = {
  pending: "brandSoft",
  confirmed: "accentSoft",
  processing: "outline",
  shipped: "neutral",
  delivered: "accent",
  cancelled: "brand",
  returned: "neutral",
};

const cancellationVariants: Record<CancellationStatus, BadgeVariant> = {
  none: "neutral",
  requested: "brandSoft",
  approved: "brand",
  rejected: "accentSoft",
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
