import type { Poisha } from "@/types/product";

/** Percentage coupons store basis points: 1500 means 15%. */
export type CouponDiscountType = "percentage" | "fixed";

export interface Coupon {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumSubtotal: Poisha;
  maximumDiscount: Poisha | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  redemptionsCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Admin form values use taka and whole percentages for readability. */
export interface CouponInput {
  code: string;
  discountType: CouponDiscountType;
  percentage: number | null;
  fixedAmountTaka: number | null;
  minimumOrderTaka: number;
  maximumDiscountTaka: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  isActive: boolean;
}

export interface CouponValidation {
  ok: boolean;
  code: string | null;
  discount: Poisha;
  message: string | null;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  body: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  /** Supplied by the caller, never trusted from the browser. */
  verifiedPurchase: boolean;
}

export interface EligibleReviewItem {
  orderItemId: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  purchasedAt: string;
}

export interface PendingReview extends ProductReview {
  orderNumber: string | null;
  productName: string;
  customerName: string;
}

export interface ReviewStats {
  rating: number | null;
  reviewCount: number;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
}

export interface StoreSettings {
  storeName: string;
  storeLogoPath: string | null;
  contactNumber: string;
  whatsappNumber: string;
  whatsappEnabled: boolean;
  contactEmail: string;
  socialLinks: SocialLinks;
  currency: string;
  storeDescription: string;
}

export type StoreSettingsInput = StoreSettings;

export type InventoryAlertType = "low_stock" | "out_of_stock";

export interface InventoryAlert {
  id: string;
  productId: string;
  productName: string;
  sku: string | null;
  alertType: InventoryAlertType;
  thresholdSnapshot: number;
  currentStock: number;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AnalyticsTotals {
  totalSales: Poisha;
  orders: number;
  averageOrderValue: Poisha;
  discountTotal: Poisha;
}

export interface BestSellingProduct {
  productId: string | null;
  name: string;
  quantitySold: number;
  revenue: Poisha;
}

export interface TopBrand {
  brand: string;
  quantitySold: number;
  revenue: Poisha;
}

export interface MonthlySale {
  month: string;
  orders: number;
  sales: Poisha;
}

export interface InventorySummary {
  skus: number;
  units: number;
  outOfStock: number;
  lowStock: number;
  stockValue: Poisha;
}

export interface AnalyticsReport {
  range: { from: string; to: string };
  totals: AnalyticsTotals;
  bestSellingProducts: BestSellingProduct[];
  topBrands: TopBrand[];
  monthlySales: MonthlySale[];
  inventory: InventorySummary;
}

export type EnquirySource = "product" | "order" | "contact";

export interface Enquiry {
  id: string;
  source: EnquirySource;
  productId: string | null;
  orderId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  message: string;
  status: "new" | "replied" | "closed";
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}
