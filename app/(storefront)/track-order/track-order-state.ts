import type { TrackedOrder } from "@/types/order";

export interface TrackOrderState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Record<string, string>;
  order: TrackedOrder | null;
  orderNumber: string;
  phone: string;
}

export const initialTrackOrderState: TrackOrderState = {
  status: "idle",
  message: "",
  fieldErrors: {},
  order: null,
  orderNumber: "",
  phone: "",
};

export interface CancellationState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Record<string, string>;
  order: TrackedOrder | null;
}

export const initialCancellationState: CancellationState = {
  status: "idle",
  message: "",
  fieldErrors: {},
  order: null,
};
