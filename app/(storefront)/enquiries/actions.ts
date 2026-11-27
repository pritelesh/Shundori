"use server";

import { revalidatePath } from "next/cache";

import type { EnquiryMutationState } from "@/app/(storefront)/enquiries/enquiry-state";
import {
  errorMessage,
  fieldErrorsOf,
  readString,
  ValidationError,
} from "@/lib/admin-validation";
import { createOrderEnquiry, createProductEnquiry } from "@/services/enquiries";

export async function sendProductEnquiryAction(
  _previous: EnquiryMutationState,
  formData: FormData,
): Promise<EnquiryMutationState> {
  try {
    await createProductEnquiry({
      productId: readString(formData, "productId"),
      customerName: readString(formData, "customerName", 100),
      customerPhone: readString(formData, "customerPhone", 30),
      customerEmail: readString(formData, "customerEmail", 160) || null,
      message: readString(formData, "message", 2000),
    });
    revalidatePath("/admin/enquiries");
    return {
      status: "success",
      message: "Your enquiry has been sent. We will reply soon.",
      fieldErrors: {},
    };
  } catch (error) {
    return {
      status: "error",
      message: errorMessage(error),
      fieldErrors: fieldErrorsOf(error),
    };
  }
}

export async function sendOrderEnquiryAction(
  _previous: EnquiryMutationState,
  formData: FormData,
): Promise<EnquiryMutationState> {
  try {
    const orderNumber = readString(formData, "orderNumber", 40).toUpperCase();
    if (!orderNumber) {
      throw new ValidationError({ orderNumber: "Enter your order number." });
    }
    await createOrderEnquiry({
      orderNumber,
      customerPhone: readString(formData, "customerPhone", 30),
      message: readString(formData, "message", 2000),
    });
    revalidatePath("/admin/enquiries");
    return {
      status: "success",
      message: "Your enquiry has been sent. We will reply soon.",
      fieldErrors: {},
    };
  } catch (error) {
    return {
      status: "error",
      message: errorMessage(error),
      fieldErrors: fieldErrorsOf(error),
    };
  }
}
