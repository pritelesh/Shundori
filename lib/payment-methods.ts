import type { PaymentMethod } from "@/types/order";

export interface PaymentMethodOption {
  id: PaymentMethod;
  label: string;
  description: string;
  enabled: boolean;
  availability: string;
}

/**
 * Central payment registry. Only methods marked `enabled` are accepted by the
 * checkout server action. Disabled methods are architecture placeholders: the
 * UI never submits them and no success/paid status is simulated.
 */
export const PAYMENT_METHOD_OPTIONS: readonly PaymentMethodOption[] = [
  {
    id: "cash_on_delivery",
    label: "Cash on Delivery",
    description: "Pay the delivery partner when your order arrives.",
    enabled: true,
    availability: "Available",
  },
  {
    id: "bkash",
    label: "bKash",
    description: "Mobile wallet checkout will be connected later.",
    enabled: false,
    availability: "Coming soon",
  },
  {
    id: "nagad",
    label: "Nagad",
    description: "Mobile wallet checkout will be connected later.",
    enabled: false,
    availability: "Coming soon",
  },
  {
    id: "sslcommerz",
    label: "SSLCommerz",
    description: "Cards and internet banking will be connected later.",
    enabled: false,
    availability: "Coming soon",
  },
];

export const ENABLED_PAYMENT_METHODS: readonly PaymentMethod[] =
  PAYMENT_METHOD_OPTIONS.filter((option) => option.enabled).map(
    (option) => option.id,
  );

export function isEnabledPaymentMethod(
  value: unknown,
): value is PaymentMethod {
  return (
    typeof value === "string" &&
    ENABLED_PAYMENT_METHODS.includes(value as PaymentMethod)
  );
}
