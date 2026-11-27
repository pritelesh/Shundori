import type { CourierProvider } from "@/types/order";

/**
 * Courier adapters are deliberately declarative until a real integration is
 * approved. No provider is active and no tracking state is generated locally;
 * the database only displays values written by a future trusted adapter.
 */
export interface CourierAdapter {
  provider: CourierProvider;
  label: string;
  enabled: boolean;
  capabilities: {
    createShipment: boolean;
    fetchTracking: boolean;
    webhooks: boolean;
  };
}

export const COURIER_ADAPTERS: readonly CourierAdapter[] = [
  {
    provider: "pathao",
    label: "Pathao",
    enabled: false,
    capabilities: { createShipment: false, fetchTracking: false, webhooks: false },
  },
  {
    provider: "steadfast",
    label: "Steadfast",
    enabled: false,
    capabilities: { createShipment: false, fetchTracking: false, webhooks: false },
  },
  {
    provider: "redx",
    label: "RedX",
    enabled: false,
    capabilities: { createShipment: false, fetchTracking: false, webhooks: false },
  },
];

export function getEnabledCourierAdapters(): readonly CourierAdapter[] {
  return COURIER_ADAPTERS.filter((adapter) => adapter.enabled);
}

export function isCourierConnected(): boolean {
  return getEnabledCourierAdapters().length > 0;
}
