"use server";

import { revalidatePath } from "next/cache";

import type { AdminMutationState } from "@/app/admin/(panel)/mutation-state";
import type { OrderStatus } from "@/types/order";
import {
  assertUuid,
  errorMessage,
  fieldErrorsOf,
  readBoolean,
  readDate,
  readDateTime,
  readInteger,
  readList,
  readString,
  ValidationError,
} from "@/lib/admin-validation";
import { updateAdminDeliveryCharge } from "@/services/admin-settings";
import {
  updateAdminStoreSettings,
  uploadStoreLogo,
} from "@/services/business-settings";
import {
  createAdminCoupon,
  deleteAdminCoupon,
  updateAdminCoupon,
} from "@/services/coupons";
import type { CouponInput } from "@/types/phase8";
import { updateAdminEnquiry } from "@/services/enquiries";
import { resolveInventoryAlert } from "@/services/inventory-alerts";
import { moderateReview } from "@/services/reviews";
import {
  createAdminProduct,
  deleteAdminProduct,
  setAdminProductActive,
  updateAdminProduct,
  updateAdminStock,
  type AdminProductInput,
} from "@/services/admin-products";
import {
  createAdminBrand,
  createAdminCategory,
  deleteAdminBrand,
  deleteAdminCategory,
  setAdminBrandActive,
  setAdminCategoryActive,
  updateAdminBrand,
  updateAdminCategory,
} from "@/services/admin-taxonomy";
import {
  decideOrderCancellation,
  updateOrderStatus,
} from "@/services/orders";

function revalidateAdminData(): void {
  for (const path of [
    "/admin/dashboard",
    "/admin/products",
    "/admin/brands",
    "/admin/categories",
    "/admin/inventory",
    "/admin/orders",
    "/admin/reviews",
    "/admin/coupons",
    "/admin/enquiries",
    "/admin/reports",
    "/admin/settings",
  ]) {
    revalidatePath(path);
  }

  // Storefront catalogue pages read the same tables. A layout revalidation
  // makes a newly published product appear without a redeploy.
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");

  // Order detail routes live below /admin/orders and read status history.
  revalidatePath("/admin/orders", "layout");
}

function failure(error: unknown): AdminMutationState {
  return {
    status: "error",
    message: errorMessage(error),
    fieldErrors: fieldErrorsOf(error),
  };
}

function readProductInput(formData: FormData): AdminProductInput {
  const regularPriceRaw = readString(formData, "regularPrice");
  const salePriceRaw = readString(formData, "salePrice");

  return {
    name: readString(formData, "name", 160),
    sku: readString(formData, "sku", 80) || null,
    brandId: readString(formData, "brandId"),
    categoryId: readString(formData, "categoryId") || null,
    description: readString(formData, "description", 5000) || null,
    shortDescription: readString(formData, "shortDescription", 240) || null,
    regularPriceTaka: Number(regularPriceRaw),
    salePriceTaka: salePriceRaw ? Number(salePriceRaw) : null,
    saleStartsAt: readDateTime(formData, "saleStartsAt"),
    saleEndsAt: readDateTime(formData, "saleEndsAt"),
    lowStockThreshold: readInteger(formData, "lowStockThreshold") ?? 5,
    stockQuantity: readInteger(formData, "stockQuantity") ?? 0,
    expiryDate: readDate(formData, "expiryDate"),
    ingredients: readList(formData, "ingredients"),
    benefits: readList(formData, "benefits"),
    usageInstructions: readList(formData, "usageInstructions"),
    isFeatured: readBoolean(formData, "isFeatured"),
    isActive: readBoolean(formData, "isActive"),
  };
}

export async function createProductAction(
  _previous: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    const product = await createAdminProduct(readProductInput(formData));
    revalidateAdminData();
    return {
      status: "success",
      message: "Product created. You can now add images.",
      fieldErrors: {},
      productId: product.id,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function updateProductAction(
  id: string,
  _previous: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    assertUuid(id);
    await updateAdminProduct(id, readProductInput(formData));
    revalidateAdminData();
    return {
      status: "success",
      message: "Product saved.",
      fieldErrors: {},
      productId: id,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteProductAction(id: string): Promise<AdminMutationState> {
  try {
    assertUuid(id);
    await deleteAdminProduct(id);
    revalidateAdminData();
    return { status: "success", message: "Product deleted.", fieldErrors: {} };
  } catch (error) {
    return failure(error);
  }
}

export async function toggleProductActiveAction(
  id: string,
  active: boolean,
): Promise<AdminMutationState> {
  try {
    assertUuid(id);
    await setAdminProductActive(id, active);
    revalidateAdminData();
    return {
      status: "success",
      message: active ? "Product published." : "Product unpublished.",
      fieldErrors: {},
    };
  } catch (error) {
    return failure(error);
  }
}

export async function updateStockAction(
  id: string,
  _previous: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    assertUuid(id);
    const quantity = readInteger(formData, "quantity");
    if (quantity === null) {
      return failure(new Error("Enter a valid whole-number quantity."));
    }
    await updateAdminStock(
      id,
      quantity,
      readString(formData, "reason", 60) || "manual_adjustment",
    );
    revalidateAdminData();
    return { status: "success", message: "Stock updated.", fieldErrors: {} };
  } catch (error) {
    return failure(error);
  }
}

export async function createBrandAction(
  _previous: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    await createAdminBrand({
      name: readString(formData, "name", 100),
      description: readString(formData, "description", 2000) || null,
      isActive: readBoolean(formData, "isActive"),
    });
    revalidateAdminData();
    return { status: "success", message: "Brand created.", fieldErrors: {} };
  } catch (error) {
    return failure(error);
  }
}

export async function updateBrandAction(
  id: string,
  _previous: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    assertUuid(id);
    await updateAdminBrand(id, {
      name: readString(formData, "name", 100),
      description: readString(formData, "description", 2000) || null,
      isActive: readBoolean(formData, "isActive"),
    });
    revalidateAdminData();
    return { status: "success", message: "Brand saved.", fieldErrors: {} };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteBrandAction(id: string): Promise<AdminMutationState> {
  try {
    assertUuid(id);
    await deleteAdminBrand(id);
    revalidateAdminData();
    return { status: "success", message: "Brand deleted.", fieldErrors: {} };
  } catch (error) {
    return failure(error);
  }
}

export async function toggleBrandActiveAction(
  id: string,
  active: boolean,
): Promise<AdminMutationState> {
  try {
    assertUuid(id);
    await setAdminBrandActive(id, active);
    revalidateAdminData();
    return {
      status: "success",
      message: active ? "Brand activated." : "Brand deactivated.",
      fieldErrors: {},
    };
  } catch (error) {
    return failure(error);
  }
}

export async function createCategoryAction(
  _previous: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    await createAdminCategory({
      name: readString(formData, "name", 100),
      description: readString(formData, "description", 2000) || null,
      parentId: readString(formData, "parentId") || null,
      isActive: readBoolean(formData, "isActive"),
    });
    revalidateAdminData();
    return { status: "success", message: "Category created.", fieldErrors: {} };
  } catch (error) {
    return failure(error);
  }
}

export async function updateCategoryAction(
  id: string,
  _previous: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    assertUuid(id);
    await updateAdminCategory(id, {
      name: readString(formData, "name", 100),
      description: readString(formData, "description", 2000) || null,
      parentId: readString(formData, "parentId") || null,
      isActive: readBoolean(formData, "isActive"),
    });
    revalidateAdminData();
    return { status: "success", message: "Category saved.", fieldErrors: {} };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteCategoryAction(id: string): Promise<AdminMutationState> {
  try {
    assertUuid(id);
    await deleteAdminCategory(id);
    revalidateAdminData();
    return { status: "success", message: "Category deleted.", fieldErrors: {} };
  } catch (error) {
    return failure(error);
  }
}

export async function toggleCategoryActiveAction(
  id: string,
  active: boolean,
): Promise<AdminMutationState> {
  try {
    assertUuid(id);
    await setAdminCategoryActive(id, active);
    revalidateAdminData();
    return {
      status: "success",
      message: active ? "Category activated." : "Category deactivated.",
      fieldErrors: {},
    };
  } catch (error) {
    return failure(error);
  }
}

export async function updateOrderStatusAction(
  id: string,
  status: OrderStatus,
): Promise<AdminMutationState> {
  try {
    assertUuid(id);
    await updateOrderStatus(id, status);
    revalidateAdminData();
    return {
      status: "success",
      message: `Order marked ${status}.`,
      fieldErrors: {},
    };
  } catch (error) {
    return failure(error);
  }
}

export async function decideOrderCancellationAction(
  id: string,
  approve: boolean,
  _previous: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    assertUuid(id);
    const order = await decideOrderCancellation(
      id,
      approve,
      readString(formData, "note", 500),
    );
    revalidateAdminData();
    return {
      status: "success",
      message: approve
        ? `Order ${order.orderNumber} cancelled and stock restored.`
        : `Cancellation rejected for ${order.orderNumber}.`,
      fieldErrors: {},
    };
  } catch (error) {
    return failure(error);
  }
}

export async function updateDeliveryChargeAction(
  _previous: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    const raw = readString(formData, "deliveryCharge");
    const amount = raw === "" ? 0 : Number(raw);
    await updateAdminDeliveryCharge(amount);
    revalidateAdminData();
    return {
      status: "success",
      message: "Delivery charge saved.",
      fieldErrors: {},
    };
  } catch (error) {
    return failure(error);
  }
}

function readStoreSettingsInput(formData: FormData): import("@/types/phase8").StoreSettingsInput {
  const socialLinks: import("@/types/phase8").SocialLinks = {};
  for (const key of ["facebook", "instagram", "youtube", "tiktok"] as const) {
    const value = readString(formData, key, 500);
    if (value) socialLinks[key] = value;
  }

  return {
    storeName: readString(formData, "storeName", 80),
    storeLogoPath: readString(formData, "storeLogoPath", 500) || null,
    contactNumber: readString(formData, "contactNumber", 40),
    whatsappNumber: readString(formData, "whatsappNumber", 40),
    whatsappEnabled: readBoolean(formData, "whatsappEnabled"),
    contactEmail: readString(formData, "contactEmail", 160),
    socialLinks,
    currency: readString(formData, "currency", 10) || "BDT",
    storeDescription: readString(formData, "storeDescription", 1000),
  };
}

export async function updateStoreSettingsAction(
  _previous: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    await updateAdminStoreSettings(readStoreSettingsInput(formData));
    revalidateAdminData();
    return {
      status: "success",
      message: "Store details saved.",
      fieldErrors: {},
    };
  } catch (error) {
    return failure(error);
  }
}

export async function uploadStoreLogoAction(
  _previous: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    const file = formData.get("logo");
    if (!(file instanceof File) || file.size === 0) {
      throw new ValidationError({ logo: "Choose a JPG, PNG or WebP image." });
    }
    const path = await uploadStoreLogo(file);
    revalidateAdminData();
    return {
      status: "success",
      message: "Store logo uploaded.",
      fieldErrors: {},
      storeLogoPath: path,
    };
  } catch (error) {
    return failure(error);
  }
}

function readNullableNumber(formData: FormData, name: string): number | null {
  const raw = readString(formData, name);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function readCouponInput(formData: FormData): CouponInput {
  const typeValue = readString(formData, "discountType");
  return {
    code: readString(formData, "code", 30).toUpperCase(),
    discountType: typeValue === "fixed" ? "fixed" : "percentage",
    percentage: readNullableNumber(formData, "percentage"),
    fixedAmountTaka: readNullableNumber(formData, "fixedAmountTaka"),
    minimumOrderTaka: readNullableNumber(formData, "minimumOrderTaka") ?? 0,
    maximumDiscountTaka: readNullableNumber(formData, "maximumDiscountTaka"),
    startsAt: readDateTime(formData, "startsAt"),
    endsAt: readDateTime(formData, "endsAt"),
    usageLimit: readInteger(formData, "usageLimit"),
    isActive: readBoolean(formData, "isActive"),
  };
}

export async function createCouponAction(
  _previous: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    await createAdminCoupon(readCouponInput(formData));
    revalidateAdminData();
    return { status: "success", message: "Coupon created.", fieldErrors: {} };
  } catch (error) {
    return failure(error);
  }
}

export async function updateCouponAction(
  id: string,
  _previous: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    assertUuid(id, "couponId");
    await updateAdminCoupon(id, readCouponInput(formData));
    revalidateAdminData();
    return { status: "success", message: "Coupon saved.", fieldErrors: {} };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteCouponAction(id: string): Promise<AdminMutationState> {
  try {
    assertUuid(id, "couponId");
    await deleteAdminCoupon(id);
    revalidateAdminData();
    return { status: "success", message: "Coupon deleted.", fieldErrors: {} };
  } catch (error) {
    return failure(error);
  }
}

export async function resolveInventoryAlertAction(
  id: string,
): Promise<AdminMutationState> {
  try {
    assertUuid(id, "alertId");
    await resolveInventoryAlert(id);
    revalidateAdminData();
    return { status: "success", message: "Alert resolved.", fieldErrors: {} };
  } catch (error) {
    return failure(error);
  }
}

export async function updateEnquiryAction(
  id: string,
  _previous: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    assertUuid(id, "enquiryId");
    const statusValue = readString(formData, "status", 20);
    if (!["new", "replied", "closed"].includes(statusValue)) {
      throw new ValidationError({ status: "Choose a valid status." });
    }
    await updateAdminEnquiry(
      id,
      statusValue as "new" | "replied" | "closed",
      readString(formData, "adminNote", 1000) || null,
    );
    revalidateAdminData();
    return { status: "success", message: "Enquiry updated.", fieldErrors: {} };
  } catch (error) {
    return failure(error);
  }
}

export async function moderateReviewAction(
  id: string,
  approve: boolean,
): Promise<AdminMutationState> {
  try {
    assertUuid(id, "reviewId");
    await moderateReview(id, approve);
    revalidateAdminData();
    return {
      status: "success",
      message: approve ? "Review approved." : "Review hidden.",
      fieldErrors: {},
    };
  } catch (error) {
    return failure(error);
  }
}
