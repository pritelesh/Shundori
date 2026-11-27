"use server";

import { revalidatePath } from "next/cache";

import {
  OrderTrackingError,
  requestCustomerCancellation,
  trackCustomerOrder,
} from "@/services/order-tracking";
import { TrackingValidationError } from "@/lib/order-tracking";
import {
  initialCancellationState,
  type CancellationState,
  type TrackOrderState,
} from "@/app/(storefront)/track-order/track-order-state";

function field(formData: FormData, name: string, max: number): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function trackOrderAction(
  _previous: TrackOrderState,
  formData: FormData,
): Promise<TrackOrderState> {
  const orderNumber = field(formData, "orderNumber", 48).toUpperCase();
  const phone = field(formData, "phone", 24);

  try {
    const order = await trackCustomerOrder({ orderNumber, phone });
    if (!order) {
      return {
        status: "error",
        message:
          "No matching order was found. Check the order number and phone number, then try again.",
        fieldErrors: {},
        order: null,
        orderNumber,
        phone,
      };
    }

    return {
      status: "success",
      message: "",
      fieldErrors: {},
      order,
      orderNumber,
      phone,
    };
  } catch (error) {
    if (error instanceof TrackingValidationError) {
      return {
        status: "error",
        message: "Check the highlighted fields and try again.",
        fieldErrors: error.fieldErrors,
        order: null,
        orderNumber,
        phone,
      };
    }

    console.error("Track-order action failed", error);
    return {
      status: "error",
      message: "We couldn't look up that order right now. Please try again.",
      fieldErrors: {},
      order: null,
      orderNumber,
      phone,
    };
  }
}

export async function requestOrderCancellationAction(
  _previous: CancellationState,
  formData: FormData,
): Promise<CancellationState> {
  try {
    const result = await requestCustomerCancellation({
      orderNumber: field(formData, "orderNumber", 48),
      phone: field(formData, "phone", 24),
      reason: field(formData, "reason", 500),
    });
    revalidatePath("/admin/orders", "layout");

    return {
      status: "success",
      message: result.alreadyRequested
        ? "A cancellation request is already waiting for review."
        : "Cancellation request submitted. Our team will review it before any stock is restored.",
      fieldErrors: {},
      order: result.order,
    };
  } catch (error) {
    if (error instanceof TrackingValidationError) {
      return {
        status: "error",
        message: "Check the highlighted fields and try again.",
        fieldErrors: error.fieldErrors,
        order: null,
      };
    }
    if (error instanceof OrderTrackingError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: {},
        order: null,
      };
    }

    console.error("Cancellation action failed", error);
    return {
      ...initialCancellationState,
      status: "error",
      message: "The cancellation request could not be submitted. Please try again.",
    };
  }
}
