"use server";

import { revalidatePath } from "next/cache";

import {
  CheckoutValidationError,
  parseCheckoutLines,
  readCheckoutCustomer,
  readIdempotencyKey,
} from "@/lib/checkout-validation";
import { isEnabledPaymentMethod } from "@/lib/payment-methods";
import {
  CheckoutError,
  getCheckoutQuote,
  placeCodOrder,
} from "@/services/checkout";
import type {
  CheckoutActionResult,
  CheckoutMutationState,
  CheckoutQuote,
} from "@/types/checkout";

export async function getCartQuoteAction(
  lines: unknown,
): Promise<CheckoutActionResult<CheckoutQuote>> {
  try {
    return { ok: true, data: await getCheckoutQuote(lines) };
  } catch (error) {
    if (error instanceof CheckoutError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof CheckoutValidationError) {
      return { ok: false, error: error.message };
    }

    console.error("Checkout quote failed", error);
    return {
      ok: false,
      error: "We could not refresh your bag right now. Please try again.",
    };
  }
}

export async function placeCodOrderAction(
  _previous: CheckoutMutationState,
  formData: FormData,
): Promise<CheckoutMutationState> {
  try {
    const customer = readCheckoutCustomer(formData);
    const paymentMethod = formData.get("paymentMethod");
    if (!isEnabledPaymentMethod(paymentMethod)) {
      throw new CheckoutValidationError(
        {
          payment:
            "Only Cash on Delivery is available right now. No online payment is simulated.",
        },
        "Choose an available payment method.",
      );
    }

    const lines = parseCheckoutLines(formData.get("items"));
    const idempotencyKey = readIdempotencyKey(formData.get("idempotencyKey"));
    const couponValue = formData.get("couponCode");
    const couponCode =
      typeof couponValue === "string" && couponValue.trim()
        ? couponValue.trim().toUpperCase()
        : null;

    const result = await placeCodOrder({
      customer,
      lines,
      idempotencyKey,
      couponCode,
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/dashboard");
    // Stock changed, so public catalogue shells must read fresh product rows.
    revalidatePath("/", "layout");

    return {
      status: "success",
      message: "Order placed.",
      fieldErrors: {},
      orderNumber: result.orderNumber,
      confirmationToken: result.confirmationToken,
    };
  } catch (error) {
    if (error instanceof CheckoutValidationError || error instanceof CheckoutError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: error.fieldErrors,
      };
    }

    console.error("Checkout action failed", error);
    return {
      status: "error",
      message: "We could not place your order right now. Please try again.",
      fieldErrors: {},
    };
  }
}
