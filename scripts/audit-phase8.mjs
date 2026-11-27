/**
 * Live Phase 8 audit against a disposable local Supabase project.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/audit-phase8.mjs
 *
 * The script loads .env.local when present. It creates throwaway users,
 * catalogue rows, coupons, orders, reviews, enquiries, wishlist rows, settings
 * and a logo, then verifies every Phase 8 feature through the same RPCs and RLS
 * policies used by the application. By default everything is removed at the
 * end. Set PHASE8_KEEP_DATA=1 to retain rows for browser testing; run
 * `npm run cleanup:phase8` afterwards.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import ts from "typescript";

import { cleanupPhase8Data, loadLocalEnv } from "./lib/phase8-cleanup.mjs";

function loadTs(relativePath) {
  const filename = resolve(process.cwd(), relativePath);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const moduleRecord = { exports: {} };
  new Function(
    "exports",
    "require",
    "module",
    "__filename",
    "__dirname",
    outputText,
  )(
    moduleRecord.exports,
    () => {
      throw new Error(`Unexpected runtime import in ${relativePath}`);
    },
    moduleRecord,
    filename,
    dirname(filename),
  );
  return moduleRecord.exports;
}

loadLocalEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && anonKey && serviceKey, "Supabase credentials are required");

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const checkoutValidation = loadTs("lib/checkout-validation.ts");

const pass = (message) => console.log(`PASS  ${message}`);
const suffix = randomUUID().slice(0, 8);
const keepData = process.env.PHASE8_KEEP_DATA === "1";
const today = new Date().toISOString().slice(0, 10);

const browser = {
  suffix,
  credentials: {},
  catalog: {},
  orders: {},
  coupons: {},
  settings: { original: {}, applied: {} },
  ids: {
    userIds: [],
    brandIds: [],
    categoryIds: [],
    productIds: [],
    couponIds: [],
    orderIds: [],
    enquiryIds: [],
    reviewIds: [],
    uploadedLogoPath: null,
  },
};
const ids = browser.ids;

function makeCustomer(label, name, phone, email) {
  const form = new FormData();
  form.set("fullName", name);
  form.set("phone", phone);
  form.set("email", email);
  form.set("division", "Dhaka");
  form.set("district", "Dhaka");
  form.set("upazila", "Gulshan");
  form.set("addressLine1", "House 10, Road 5, Gulshan 2");
  form.set("addressLine2", "");
  form.set("postalCode", "1212");
  form.set("notes", "Phase 8 audit");
  const customer = checkoutValidation.readCheckoutCustomer(form);
  if (label) browser.orders[label] = { customer };
  return customer;
}

const buyer = makeCustomer("buyer", "Audit Rahima", "01712345678", `buyer-${suffix}@example.test`);
makeCustomer(
  "outsider",
  "Audit Karim",
  "01812345678",
  `outsider-${suffix}@example.test`,
);

function fingerprint(customer, lines, couponCode) {
  const canonical = {
    couponCode: couponCode ? couponCode.trim().toUpperCase() : null,
    customer: {
      fullName: customer.fullName.trim(),
      phone: customer.phone.trim(),
      email: customer.email?.trim() ?? null,
      division: customer.division.trim(),
      district: customer.district.trim(),
      upazila: customer.upazila.trim(),
      addressLine1: customer.addressLine1.trim(),
      addressLine2: customer.addressLine2?.trim() ?? null,
      postalCode: customer.postalCode?.trim() ?? null,
      notes: customer.notes?.trim() ?? null,
    },
    lines: [...lines]
      .map((line) => ({ productId: line.productId, quantity: line.quantity }))
      .sort((a, b) => a.productId.localeCompare(b.productId)),
    paymentMethod: "cash_on_delivery",
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

async function createUser(label, role = "customer") {
  const email = `phase8-${label}-${suffix}@example.test`;
  const password = "Phase8Audit123!";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.ifError(error);
  ids.userIds.push(data.user.id);

  if (role !== "customer") {
    const { error: roleError } = await admin
      .from("profiles")
      .update({ role })
      .eq("id", data.user.id);
    assert.ifError(roleError);
  }

  const session = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await session.auth.signInWithPassword({
    email,
    password,
  });
  assert.ifError(signInError);

  browser.credentials[label] = { email, password, role, id: data.user.id };
  return { id: data.user.id, client: session };
}

async function placeOrder({
  productId,
  quantity = 1,
  couponCode = null,
  customer = buyer,
  customerId = null,
  key = randomUUID(),
  overrideFingerprint = null,
}) {
  const lines = [{ productId, quantity }];
  const { data, error } = await admin.rpc("place_cod_order", {
    p_idempotency_key: key,
    p_idempotency_fingerprint:
      overrideFingerprint ?? fingerprint(customer, lines, couponCode),
    p_customer_id: customerId,
    p_customer_name: customer.fullName,
    p_customer_phone: customer.phone,
    p_customer_email: customer.email,
    p_delivery_address: checkoutValidation.toCheckoutAddress(customer),
    p_notes: customer.notes,
    p_items: lines,
    p_changed_by: customerId,
    p_coupon_code: couponCode,
  });

  if (data?.orderId) ids.orderIds.push(data.orderId);
  return { data, error, key, lines, customer };
}

async function markDelivered(orderId, adminUser) {
  for (const status of ["confirmed", "processing", "shipped", "delivered"]) {
    const { error } = await admin.rpc("set_order_status", {
      p_order_id: orderId,
      p_status: status,
      p_actor_id: adminUser.id,
      p_note: "Phase 8 audit delivery",
    });
    assert.ifError(error, `status transition to ${status} failed`);
  }
}

async function insertProduct(label, overrides = {}) {
  const name = `Phase 8 ${label} ${suffix}`;
  const slug = `phase8-${label.toLowerCase()}-${suffix}`;
  const { data, error } = await admin
    .from("products")
    .insert({
      name,
      slug,
      brand_id: ids.brandIds[0],
      category_id: ids.categoryIds[0],
      regular_price: 100000,
      sale_price: null,
      sale_starts_at: null,
      sale_ends_at: null,
      stock_quantity: 10,
      low_stock_threshold: 5,
      visual: "dropper",
      tone: "emerald",
      is_active: true,
      ...overrides,
    })
    .select("*")
    .single();
  assert.ifError(error);
  ids.productIds.push(data.id);
  return data;
}

async function insertCoupon(label, overrides = {}) {
  const code = `${label.toUpperCase()}${suffix.toUpperCase()}`;
  const { data, error } = await admin
    .from("coupons")
    .insert({
      code,
      discount_type: "percentage",
      discount_value: 1000,
      minimum_subtotal_poisha: 0,
      maximum_discount_poisha: null,
      starts_at: null,
      ends_at: null,
      usage_limit: null,
      is_active: true,
      ...overrides,
    })
    .select("*")
    .single();
  assert.ifError(error);
  ids.couponIds.push(data.id);
  return data;
}

async function validate(code, subtotal, session = anon) {
  const { data, error } = await session.rpc("validate_coupon", {
    p_code: code,
    p_subtotal: subtotal,
  });
  assert.ifError(error);
  return data ?? {};
}

async function report() {
  const { data, error } = await admin.rpc("phase8_analytics_report", {
    p_from: today,
    p_to: today,
  });
  assert.ifError(error);
  return data;
}

async function expectDenied(promise, label) {
  const { error } = await promise;
  assert.ok(error, `${label} must be denied`);
  return error;
}

async function expectEmpty(session, table, column, value) {
  const { data, error } = await session.from(table).select("id").eq(column, value);
  assert.ifError(error);
  assert.deepEqual(data ?? [], [], `${table} row must not be visible`);
}

const dataFile = resolve(process.cwd(), ".phase8-audit-data.json");
if (keepData) writeFileSync(dataFile, `${JSON.stringify(browser, null, 2)}\n`);
let finished = false;

try {
  // Migration metadata is intentionally available to anonymous clients.
  const { data: migrationReport, error: migrationError } = await anon.rpc(
    "phase8_report",
  );
  assert.ifError(migrationError);
  for (const table of [
    "coupons",
    "coupon_redemptions",
    "wishlists",
    "product_reviews",
    "enquiries",
    "inventory_alerts",
  ]) {
    assert.ok(migrationReport.tables.includes(table), `${table} is missing`);
  }
  for (const name of [
    "validate_coupon",
    "place_cod_order",
    "can_review_product",
    "product_review_stats",
    "get_store_settings",
    "create_product_enquiry",
    "create_order_enquiry",
    "phase8_analytics_report",
  ]) {
    assert.ok(migrationReport.functions.includes(name), `${name} is missing`);
  }
  assert.ok(migrationReport.columns.includes("products.discount_percentage"));
  assert.ok(migrationReport.columns.includes("orders.coupon_code"));
  assert.ok(migrationReport.buckets.includes("store-assets"));
  pass("Phase 8 schema, functions, columns and storage bucket are installed");

  const baseline = await report();

  const originalSettings = await admin.from("store_settings").select("key, value");
  assert.ifError(originalSettings.error);
  for (const row of originalSettings.data ?? []) {
    browser.settings.original[row.key] = row.value;
  }

  const adminUser = await createUser("admin", "admin");
  const customerUser = await createUser("customer", "customer");
  const outsiderUser = await createUser("outsider", "customer");
  pass("throwaway admin, customer and outsider sessions were created");

  const { data: brand, error: brandError } = await admin
    .from("brands")
    .insert({ name: `Phase 8 Brand ${suffix}`, slug: `phase8-brand-${suffix}` })
    .select("id, name")
    .single();
  assert.ifError(brandError);
  ids.brandIds.push(brand.id);

  const { data: category, error: categoryError } = await admin
    .from("categories")
    .insert({
      name: `Phase 8 Category ${suffix}`,
      slug: `phase8-category-${suffix}`,
    })
    .select("id")
    .single();
  assert.ifError(categoryError);
  ids.categoryIds.push(category.id);

  const futureStart = new Date(Date.now() + 86_400_000).toISOString();
  const futureEnd = new Date(Date.now() + 172_800_000).toISOString();
  const pastStart = new Date(Date.now() - 172_800_000).toISOString();
  const pastEnd = new Date(Date.now() - 86_400_000).toISOString();

  const futureOffer = await insertProduct("future-offer", {
    regular_price: 100000,
    sale_price: 50000,
    sale_starts_at: futureStart,
    sale_ends_at: futureEnd,
  });
  const activeOffer = await insertProduct("active-offer", {
    regular_price: 100000,
    sale_price: 70000,
    sale_starts_at: pastStart,
    sale_ends_at: futureEnd,
    stock_quantity: 20,
  });
  const expiredOffer = await insertProduct("expired-offer", {
    regular_price: 90000,
    sale_price: 10000,
    sale_starts_at: pastStart,
    sale_ends_at: pastEnd,
  });
  const couponProduct = await insertProduct("coupon-product", {
    regular_price: 100000,
    stock_quantity: 30,
  });
  const reviewProduct = await insertProduct("review-product", {
    stock_quantity: 10,
  });
  const pendingProduct = await insertProduct("pending-product", {
    stock_quantity: 10,
  });
  const inactiveProduct = await insertProduct("inactive-product", {
    is_active: false,
  });
  const wishlistA = await insertProduct("wishlist-a");
  const wishlistB = await insertProduct("wishlist-b");
  const alertLow = await insertProduct("alert-low", {
    stock_quantity: 3,
    low_stock_threshold: 5,
  });
  const alertOut = await insertProduct("alert-out", {
    stock_quantity: 0,
    low_stock_threshold: 5,
  });
  const alertResolve = await insertProduct("alert-resolve", {
    stock_quantity: 4,
    low_stock_threshold: 5,
  });

  browser.catalog = {
    futureOffer: { id: futureOffer.id, slug: futureOffer.slug, name: futureOffer.name },
    activeOffer: { id: activeOffer.id, slug: activeOffer.slug, name: activeOffer.name },
    expiredOffer: { id: expiredOffer.id, slug: expiredOffer.slug, name: expiredOffer.name },
    couponProduct: { id: couponProduct.id, slug: couponProduct.slug, name: couponProduct.name },
    reviewProduct: { id: reviewProduct.id, slug: reviewProduct.slug, name: reviewProduct.name },
    wishlistA: { id: wishlistA.id, slug: wishlistA.slug, name: wishlistA.name },
    wishlistB: { id: wishlistB.id, slug: wishlistB.slug, name: wishlistB.name },
    alertLow: { id: alertLow.id, slug: alertLow.slug, name: alertLow.name },
    alertOut: { id: alertOut.id, slug: alertOut.slug, name: alertOut.name },
  };

  const percentages = await admin
    .from("products")
    .select("id, discount_percentage")
    .in("id", [futureOffer.id, activeOffer.id, expiredOffer.id]);
  assert.ifError(percentages.error);
  const percentageMap = new Map(
    percentages.data.map((row) => [row.id, row.discount_percentage]),
  );
  assert.equal(percentageMap.get(futureOffer.id), 50);
  assert.equal(percentageMap.get(activeOffer.id), 30);
  assert.equal(percentageMap.get(expiredOffer.id), 88);
  pass("discount percentages are generated from regular and sale prices");

  const futureOrder = await placeOrder({ productId: futureOffer.id });
  assert.ifError(futureOrder.error);
  assert.equal(futureOrder.data.subtotal, 100000);

  const activeOrder = await placeOrder({ productId: activeOffer.id, quantity: 2 });
  assert.ifError(activeOrder.error);
  assert.equal(activeOrder.data.subtotal, 140000);

  const expiredOrder = await placeOrder({ productId: expiredOffer.id });
  assert.ifError(expiredOrder.error);
  assert.equal(expiredOrder.data.subtotal, 90000);

  const pricingItems = await admin
    .from("order_items")
    .select("product_id, unit_price")
    .in("order_id", [
      futureOrder.data.orderId,
      activeOrder.data.orderId,
      expiredOrder.data.orderId,
    ]);
  assert.ifError(pricingItems.error);
  const unitPrices = new Map(
    pricingItems.data.map((item) => [item.product_id, item.unit_price]),
  );
  assert.equal(unitPrices.get(futureOffer.id), 100000);
  assert.equal(unitPrices.get(activeOffer.id), 70000);
  assert.equal(unitPrices.get(expiredOffer.id), 90000);
  pass("order placement uses offer windows, not display-only browser prices");

  const percentCoupon = await insertCoupon("pct", {
    discount_value: 1500,
    minimum_subtotal_poisha: 200000,
    maximum_discount_poisha: 30000,
    usage_limit: 5,
  });
  const inactiveCoupon = await insertCoupon("off", { is_active: false });
  const expiredCoupon = await insertCoupon("exp", {
    ends_at: pastEnd,
  });
  const futureCoupon = await insertCoupon("later", {
    starts_at: futureStart,
    ends_at: futureEnd,
  });
  const minimumCoupon = await insertCoupon("min", {
    minimum_subtotal_poisha: 500000,
  });
  const limitedCoupon = await insertCoupon("one", {
    discount_value: 1000,
    usage_limit: 1,
  });
  const browserCoupon = await insertCoupon("web", {
    discount_value: 1000,
    maximum_discount_poisha: 20000,
  });
  browser.coupons = {
    browserCode: browserCoupon.code,
    percentCode: percentCoupon.code,
    limitedCode: limitedCoupon.code,
  };

  const percentValidation = await validate(percentCoupon.code, 300000);
  assert.equal(percentValidation.ok, true);
  assert.equal(percentValidation.discount, 30000);
  assert.equal(percentValidation.code, percentCoupon.code);
  assert.equal((await validate(`  ${percentCoupon.code.toLowerCase()}  `, 300000)).ok, true);
  assert.match((await validate("NOPE!", 300000)).message, /valid coupon code/i);
  assert.match((await validate(inactiveCoupon.code, 300000)).message, /not active/i);
  assert.match((await validate(expiredCoupon.code, 300000)).message, /expired/i);
  assert.match((await validate(futureCoupon.code, 300000)).message, /not active yet/i);
  assert.match((await validate(minimumCoupon.code, 100000)).message, /minimum order amount/i);
  pass("coupon codes, windows, status, minimums and caps are validated server-side");

  const lines = [{ productId: couponProduct.id, quantity: 3 }];
  const couponKey = randomUUID();
  const couponOrder = await placeOrder({
    productId: couponProduct.id,
    quantity: 3,
    couponCode: percentCoupon.code,
    key: couponKey,
  });
  assert.ifError(couponOrder.error);
  assert.equal(couponOrder.data.subtotal, 300000);
  assert.equal(couponOrder.data.discount, 30000);
  assert.equal(
    couponOrder.data.total,
    300000 + couponOrder.data.deliveryCharge - 30000,
  );
  assert.equal(couponOrder.data.couponCode, percentCoupon.code);

  const { data: couponOrderRow, error: couponOrderError } = await admin
    .from("orders")
    .select("discount, coupon_code, total_amount")
    .eq("id", couponOrder.data.orderId)
    .single();
  assert.ifError(couponOrderError);
  assert.equal(couponOrderRow.discount, 30000);
  assert.equal(couponOrderRow.coupon_code, percentCoupon.code);

  const { data: redemption, error: redemptionError } = await admin
    .from("coupon_redemptions")
    .select("discount_poisha, coupon_id, order_id")
    .eq("order_id", couponOrder.data.orderId)
    .single();
  assert.ifError(redemptionError);
  assert.equal(redemption.discount_poisha, 30000);
  assert.equal(redemption.coupon_id, percentCoupon.id);

  const { data: usedCoupon, error: usedCouponError } = await admin
    .from("coupons")
    .select("redemptions_count")
    .eq("id", percentCoupon.id)
    .single();
  assert.ifError(usedCouponError);
  assert.equal(usedCoupon.redemptions_count, 1);

  const replay = await placeOrder({
    productId: couponProduct.id,
    quantity: 3,
    couponCode: percentCoupon.code,
    key: couponKey,
  });
  assert.ifError(replay.error);
  assert.equal(replay.data.orderId, couponOrder.data.orderId);
  const { data: afterReplay } = await admin
    .from("coupons")
    .select("redemptions_count")
    .eq("id", percentCoupon.id)
    .single();
  assert.equal(afterReplay.redemptions_count, 1);

  const changedDetails = await placeOrder({
    productId: couponProduct.id,
    quantity: 3,
    couponCode: browserCoupon.code,
    key: couponKey,
    overrideFingerprint: fingerprint(buyer, lines, browserCoupon.code),
  });
  assert.ok(changedDetails.error, "reusing a key with another coupon must fail");
  assert.match(changedDetails.error.message, /different details/i);

  const orderCountBeforeInvalid = (
    await admin.from("orders").select("id", { count: "exact", head: true })
  ).count;
  const invalidCouponOrder = await placeOrder({
    productId: couponProduct.id,
    couponCode: expiredCoupon.code,
  });
  assert.ok(invalidCouponOrder.error, "an expired coupon must be rejected at placement");
  const orderCountAfterInvalid = (
    await admin.from("orders").select("id", { count: "exact", head: true })
  ).count;
  assert.equal(orderCountAfterInvalid, orderCountBeforeInvalid);
  pass("coupon redemption is recorded once and placement rejects stale coupons");

  const [limitFirst, limitSecond] = await Promise.all([
    placeOrder({ productId: couponProduct.id, couponCode: limitedCoupon.code }),
    placeOrder({ productId: couponProduct.id, couponCode: limitedCoupon.code }),
  ]);
  const successes = [limitFirst, limitSecond].filter((entry) => !entry.error);
  const failures = [limitFirst, limitSecond].filter((entry) => entry.error);
  assert.equal(successes.length, 1, "exactly one concurrent redemption can succeed");
  assert.equal(failures.length, 1);
  assert.match(failures[0].error.message, /usage limit/i);
  const { data: limitedAfter } = await admin
    .from("coupons")
    .select("redemptions_count")
    .eq("id", limitedCoupon.id)
    .single();
  assert.equal(limitedAfter.redemptions_count, 1);
  const { data: limitedRedemptions } = await admin
    .from("coupon_redemptions")
    .select("id")
    .eq("coupon_id", limitedCoupon.id);
  assert.equal(limitedRedemptions.length, 1);
  pass("concurrent coupon use is serialized by a row lock and cannot exceed the limit");

  const wishlistInsert = await customerUser.client
    .from("wishlists")
    .insert({ user_id: customerUser.id, product_id: wishlistA.id });
  assert.ifError(wishlistInsert.error);
  const wishlistDuplicate = await customerUser.client.from("wishlists").upsert(
    { user_id: customerUser.id, product_id: wishlistA.id },
    { onConflict: "user_id,product_id", ignoreDuplicates: true },
  );
  assert.ifError(wishlistDuplicate.error);
  await customerUser.client.from("wishlists").insert({
    user_id: customerUser.id,
    product_id: wishlistB.id,
  });
  const { data: ownWishlist } = await customerUser.client
    .from("wishlists")
    .select("product_id")
    .eq("user_id", customerUser.id);
  assert.equal(ownWishlist.length, 2);

  const removeWishlist = await customerUser.client
    .from("wishlists")
    .delete()
    .eq("user_id", customerUser.id)
    .eq("product_id", wishlistB.id);
  assert.ifError(removeWishlist.error);
  await expectEmpty(customerUser.client, "wishlists", "product_id", wishlistB.id);
  await expectEmpty(outsiderUser.client, "wishlists", "user_id", customerUser.id);
  await expectDenied(
    outsiderUser.client
      .from("wishlists")
      .insert({ user_id: customerUser.id, product_id: wishlistB.id }),
    "writing another customer's wishlist",
  );
  await expectDenied(
    anon.from("wishlists").insert({ user_id: customerUser.id, product_id: wishlistB.id }),
    "anonymous wishlist write",
  );
  pass("authenticated wishlists persist with owner-only RLS; guests are refused");

  const deliveredOrder = await placeOrder({
    productId: reviewProduct.id,
    customer: buyer,
    customerId: customerUser.id,
  });
  assert.ifError(deliveredOrder.error);
  await markDelivered(deliveredOrder.data.orderId, adminUser);
  const { data: reviewItem, error: reviewItemError } = await admin
    .from("order_items")
    .select("id")
    .eq("order_id", deliveredOrder.data.orderId)
    .single();
  assert.ifError(reviewItemError);

  await expectEmpty(anon, "product_reviews", "product_id", reviewProduct.id);
  const submitted = await customerUser.client.from("product_reviews").insert({
    product_id: reviewProduct.id,
    user_id: customerUser.id,
    order_id: deliveredOrder.data.orderId,
    order_item_id: reviewItem.id,
    rating: 5,
    body: "Excellent quality and careful packaging.",
    is_approved: false,
  });
  assert.ifError(submitted.error);
  const { data: reviewRow, error: reviewRowError } = await admin
    .from("product_reviews")
    .select("id, is_approved, order_id")
    .eq("order_item_id", reviewItem.id)
    .single();
  assert.ifError(reviewRowError);
  ids.reviewIds.push(reviewRow.id);
  assert.equal(reviewRow.is_approved, false, "new reviews must start unapproved");
  assert.equal(
    reviewRow.order_id,
    deliveredOrder.data.orderId,
    "verified purchase status is derived from the linked delivered order",
  );

  await expectDenied(
    customerUser.client.from("product_reviews").insert({
      product_id: reviewProduct.id,
      user_id: customerUser.id,
      order_id: deliveredOrder.data.orderId,
      order_item_id: reviewItem.id,
      rating: 5,
      body: "A duplicate review of the same order item.",
      is_approved: false,
    }),
    "duplicate review",
  );
  await expectDenied(
    outsiderUser.client.from("product_reviews").insert({
      product_id: reviewProduct.id,
      user_id: outsiderUser.id,
      order_id: deliveredOrder.data.orderId,
      order_item_id: reviewItem.id,
      rating: 5,
      body: "This customer did not buy the product.",
      is_approved: false,
    }),
    "reviewing another customer's order",
  );
  const selfApproval = await customerUser.client
    .from("product_reviews")
    .update({ is_approved: true })
    .eq("id", reviewRow.id);
  assert.ifError(selfApproval.error);
  const { data: afterSelfApproval } = await admin
    .from("product_reviews")
    .select("is_approved")
    .eq("id", reviewRow.id)
    .single();
  assert.equal(
    afterSelfApproval.is_approved,
    false,
    "customers cannot approve their own review",
  );

  const pendingOrder = await placeOrder({
    productId: pendingProduct.id,
    customer: buyer,
    customerId: customerUser.id,
  });
  assert.ifError(pendingOrder.error);
  const { data: pendingItem, error: pendingItemError } = await admin
    .from("order_items")
    .select("id")
    .eq("order_id", pendingOrder.data.orderId)
    .single();
  assert.ifError(pendingItemError);
  await expectDenied(
    customerUser.client.from("product_reviews").insert({
      product_id: pendingProduct.id,
      user_id: customerUser.id,
      order_id: pendingOrder.data.orderId,
      order_item_id: pendingItem.id,
      rating: 5,
      body: "This purchase has not been delivered yet.",
      is_approved: false,
    }),
    "reviewing an undelivered order",
  );

  const { error: approveError } = await admin
    .from("product_reviews")
    .update({ is_approved: true })
    .eq("id", reviewRow.id);
  assert.ifError(approveError);
  const { data: publicReviews } = await anon
    .from("product_reviews")
    .select("id, rating, body")
    .eq("product_id", reviewProduct.id);
  assert.equal(publicReviews.length, 1);
  assert.equal(publicReviews[0].rating, 5);
  const { data: stats, error: statsError } = await anon.rpc("product_review_stats");
  assert.ifError(statsError);
  assert.equal(stats[reviewProduct.id].rating, 5);
  assert.equal(stats[reviewProduct.id].reviewCount, 1);
  const customerModeration = await customerUser.client
    .from("product_reviews")
    .update({ is_approved: false })
    .eq("id", reviewRow.id);
  assert.ifError(customerModeration.error);
  const { data: afterModeration } = await admin
    .from("product_reviews")
    .select("is_approved")
    .eq("id", reviewRow.id)
    .single();
  assert.equal(
    afterModeration.is_approved,
    true,
    "customers cannot reverse an admin moderation decision",
  );
  browser.orders.delivered = {
    orderNumber: deliveredOrder.data.orderNumber,
    phone: buyer.phone,
  };
  pass("reviews require delivered purchases, start unapproved and are admin-moderated");

  const { data: productEnquiryRpc, error: productEnquiryError } = await anon.rpc(
    "create_product_enquiry",
    {
      p_product_id: activeOffer.id,
      p_customer_name: "Audit Enquirer",
      p_customer_phone: "01712345678",
      p_customer_email: "enquiry@example.test",
      p_message: `Is this product suitable for sensitive skin? ${suffix}`,
    },
  );
  assert.ifError(productEnquiryError);
  assert.equal(productEnquiryRpc.ok, true);
  await expectDenied(
    anon.rpc("create_product_enquiry", {
      p_product_id: inactiveProduct.id,
      p_customer_name: "Audit Enquirer",
      p_customer_phone: "01712345678",
      p_customer_email: null,
      p_message: `Can I ask about an unpublished product? ${suffix}`,
    }),
    "product enquiry for an inactive product",
  );

  const enquiryCountBefore = (
    await admin.from("enquiries").select("id", { count: "exact", head: true })
  ).count;
  const correctOrderEnquiry = await anon.rpc("create_order_enquiry", {
    p_order_number: deliveredOrder.data.orderNumber,
    p_customer_phone: "+88 01712-345678",
    p_message: `Could you confirm the delivery time for my order? ${suffix}`,
  });
  assert.ifError(correctOrderEnquiry.error);
  assert.equal(correctOrderEnquiry.data.ok, true);

  const wrongPhone = await anon.rpc("create_order_enquiry", {
    p_order_number: deliveredOrder.data.orderNumber,
    p_customer_phone: "01999999999",
    p_message: "Could you confirm the delivery time for my order?",
  });
  assert.ok(wrongPhone.error);
  const unknownOrder = await anon.rpc("create_order_enquiry", {
    p_order_number: "SD-20990101-AAAAAAAA",
    p_customer_phone: "01712345678",
    p_message: "Could you confirm the delivery time for my order?",
  });
  assert.ok(unknownOrder.error);
  assert.equal(
    wrongPhone.error.message,
    unknownOrder.error.message,
    "wrong phone and unknown order must return the same generic error",
  );
  const enquiryCountAfter = (
    await admin.from("enquiries").select("id", { count: "exact", head: true })
  ).count;
  assert.equal(enquiryCountAfter, enquiryCountBefore + 1);

  const { data: enquiryRows, error: enquiryRowsError } = await admin
    .from("enquiries")
    .select("id, source, product_id, order_id, customer_name, status")
    .like("message", `%${suffix}%`);
  assert.ifError(enquiryRowsError);
  const productEnquiryRow = enquiryRows.find((row) => row.source === "product");
  const orderEnquiryRow = enquiryRows.find((row) => row.source === "order");
  assert.ok(productEnquiryRow);
  assert.ok(orderEnquiryRow);
  assert.equal(productEnquiryRow.product_id, activeOffer.id);
  assert.equal(orderEnquiryRow.order_id, deliveredOrder.data.orderId);
  ids.enquiryIds.push(productEnquiryRow.id, orderEnquiryRow.id);

  await expectDenied(
    anon.from("enquiries").select("id").eq("id", productEnquiryRow.id),
    "anonymous enquiry read",
  );
  await expectEmpty(
    customerUser.client,
    "enquiries",
    "id",
    productEnquiryRow.id,
  );
  const { data: adminEnquiries } = await adminUser.client
    .from("enquiries")
    .select("id")
    .eq("id", productEnquiryRow.id);
  assert.equal(adminEnquiries.length, 1);

  const { error: enquiryUpdateError } = await admin
    .from("enquiries")
    .update({
      status: "replied",
      admin_note: "Audit staff reply",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderEnquiryRow.id);
  assert.ifError(enquiryUpdateError);
  const { data: updatedEnquiry } = await admin
    .from("enquiries")
    .select("status, admin_note")
    .eq("id", orderEnquiryRow.id)
    .single();
  assert.equal(updatedEnquiry.status, "replied");
  assert.equal(updatedEnquiry.admin_note, "Audit staff reply");
  pass("product and order enquiries are private, verified and manageable by staff");

  const appliedSettings = {
    store_name: "Phase 8 Audit Store",
    contact_number: "+8801712345678",
    whatsapp_number: "01712345678",
    whatsapp_enabled: true,
    contact_email: "audit-store@example.test",
    social_links: { facebook: "https://example.com/phase8" },
    currency: "BDT",
    store_description: "Phase 8 audit store description.",
  };
  for (const [key, value] of Object.entries(appliedSettings)) {
    const { error } = await admin.from("store_settings").upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    assert.ifError(error);
  }
  browser.settings.applied = appliedSettings;

  const { data: publicSettings, error: publicSettingsError } = await anon.rpc(
    "get_store_settings",
  );
  assert.ifError(publicSettingsError);
  assert.equal(publicSettings.storeName, appliedSettings.store_name);
  assert.equal(publicSettings.contactNumber, appliedSettings.contact_number);
  assert.equal(publicSettings.whatsappNumber, appliedSettings.whatsapp_number);
  assert.equal(publicSettings.whatsappEnabled, true);
  assert.equal(publicSettings.contactEmail, appliedSettings.contact_email);
  assert.equal(publicSettings.currency, appliedSettings.currency);
  assert.equal(publicSettings.storeDescription, appliedSettings.store_description);
  assert.equal(publicSettings.socialLinks.facebook, appliedSettings.social_links.facebook);
  await expectDenied(
    anon.from("store_settings").select("key").eq("key", "contact_email"),
    "direct store settings read",
  );
  pass("business settings are public only through the narrow settings RPC");

  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";
  const logoPath = `store/phase8-audit-${suffix}.png`;
  const { error: uploadError } = await admin.storage
    .from("store-assets")
    .upload(logoPath, Uint8Array.from(Buffer.from(pngBase64, "base64")), {
      contentType: "image/png",
      upsert: false,
    });
  assert.ifError(uploadError);
  ids.uploadedLogoPath = logoPath;
  const { error: logoSettingError } = await admin.from("store_settings").upsert(
    {
      key: "store_logo_path",
      value: logoPath,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  assert.ifError(logoSettingError);
  const logoUrl = anon.storage.from("store-assets").getPublicUrl(logoPath).data.publicUrl;
  const logoResponse = await fetch(logoUrl);
  assert.equal(logoResponse.status, 200, "the public logo must be readable");
  assert.match(logoResponse.headers.get("content-type") ?? "", /image\/png/);
  pass("store logos upload to a public bucket and resolve through the settings RPC");

  const { data: initialAlerts, error: initialAlertsError } = await admin
    .from("inventory_alerts")
    .select("product_id, alert_type, resolved_at")
    .in("product_id", [alertLow.id, alertOut.id, alertResolve.id]);
  assert.ifError(initialAlertsError);
  const openAlert = (productId, type) =>
    initialAlerts.find(
      (row) =>
        row.product_id === productId &&
        row.alert_type === type &&
        row.resolved_at === null,
    );
  assert.ok(openAlert(alertLow.id, "low_stock"));
  assert.ok(openAlert(alertOut.id, "out_of_stock"));
  assert.ok(openAlert(alertResolve.id, "low_stock"));

  assert.ifError(
    (await admin.from("products").update({ stock_quantity: 10 }).eq("id", alertLow.id)).error,
  );
  assert.ifError(
    (await admin.from("products").update({ stock_quantity: 2 }).eq("id", alertOut.id)).error,
  );
  assert.ifError(
    (await admin.from("products").update({ low_stock_threshold: 1 }).eq("id", alertOut.id)).error,
  );
  assert.ifError(
    (await admin.from("products").update({ stock_quantity: 1 }).eq("id", alertResolve.id)).error,
  );
  assert.ifError(
    (await admin.from("products").update({ stock_quantity: 1 }).eq("id", alertResolve.id)).error,
  );

  const { data: afterAlerts } = await admin
    .from("inventory_alerts")
    .select("id, product_id, alert_type, resolved_at")
    .eq("product_id", alertResolve.id)
    .is("resolved_at", null);
  assert.equal(afterAlerts.length, 1, "one open alert per product and condition");

  await expectEmpty(customerUser.client, "inventory_alerts", "product_id", alertResolve.id);
  const { data: adminAlerts } = await adminUser.client
    .from("inventory_alerts")
    .select("id")
    .eq("product_id", alertResolve.id);
  assert.equal(adminAlerts.length, 1);

  const { error: resolveError } = await admin
    .from("inventory_alerts")
    .update({ resolved_at: new Date().toISOString(), resolved_by: adminUser.id })
    .eq("id", afterAlerts[0].id)
    .is("resolved_at", null);
  assert.ifError(resolveError);
  const { data: resolvedCheck } = await admin
    .from("inventory_alerts")
    .select("resolved_at")
    .eq("id", afterAlerts[0].id)
    .single();
  assert.ok(resolvedCheck.resolved_at);

  assert.ifError(
    (await admin.from("products").update({ stock_quantity: 2 }).eq("id", alertLow.id)).error,
  );
  assert.ifError(
    (await admin.from("products").update({ stock_quantity: 0, low_stock_threshold: 5 }).eq("id", alertOut.id)).error,
  );
  pass("stock threshold alerts open, deduplicate, resolve and stay admin-only");

  const finalProducts = await admin
    .from("products")
    .select("id, stock_quantity, regular_price, sale_price, sale_starts_at, sale_ends_at")
    .in("id", ids.productIds);
  assert.ifError(finalProducts.error);
  const expectedInventoryDelta = {
    skus: finalProducts.data.length,
    units: finalProducts.data.reduce((sum, row) => sum + row.stock_quantity, 0),
  };

  const auditOrders = await admin
    .from("orders")
    .select("id, total_amount, discount, order_status, payment_status")
    .in("id", ids.orderIds);
  assert.ifError(auditOrders.error);
  const countedOrders = auditOrders.data.filter(
    (row) => !["cancelled", "returned"].includes(row.order_status) && row.payment_status !== "refunded",
  );
  const expectedSales = countedOrders.reduce((sum, row) => sum + row.total_amount, 0);
  const expectedDiscount = countedOrders.reduce((sum, row) => sum + row.discount, 0);

  // A cancelled order must not contribute to the analytics totals.
  const cancelledOrder = await placeOrder({ productId: couponProduct.id });
  assert.ifError(cancelledOrder.error);
  const { error: cancelError } = await admin.rpc("set_order_status", {
    p_order_id: cancelledOrder.data.orderId,
    p_status: "cancelled",
    p_actor_id: adminUser.id,
    p_note: "Phase 8 audit exclusion",
  });
  assert.ifError(cancelError);

  const after = await report();
  assert.equal(after.totals.totalSales - baseline.totals.totalSales, expectedSales);
  assert.equal(after.totals.orders - baseline.totals.orders, countedOrders.length);
  assert.equal(after.totals.discountTotal - baseline.totals.discountTotal, expectedDiscount);
  assert.equal(after.inventory.skus - baseline.inventory.skus, expectedInventoryDelta.skus);
  assert.equal(after.inventory.units - baseline.inventory.units, expectedInventoryDelta.units);

  const productSales = await admin
    .from("order_items")
    .select("product_id, product_name, quantity, total_price, order_id")
    .in("order_id", ids.orderIds);
  assert.ifError(productSales.error);
  const countedOrderIds = new Set(countedOrders.map((row) => row.id));
  const activeSales = productSales.data.filter((row) => countedOrderIds.has(row.order_id));
  const activeExpected = activeSales
    .filter((row) => row.product_id === activeOffer.id)
    .reduce(
      (acc, row) => ({
        quantity: acc.quantity + row.quantity,
        revenue: acc.revenue + row.total_price,
      }),
      { quantity: 0, revenue: 0 },
    );
  const bestSeller = after.bestSellingProducts.find(
    (row) => row.productId === activeOffer.id,
  );
  assert.ok(bestSeller, "the sold product must appear in best sellers");
  assert.equal(bestSeller.quantitySold, activeExpected.quantity);
  assert.equal(bestSeller.revenue, activeExpected.revenue);

  const brandSales = after.topBrands.find((row) => row.brand === brand.name);
  assert.ok(
    brandSales,
    `the throwaway brand ${brand.name} must appear in top brands: ${JSON.stringify(after.topBrands)}`,
  );
  assert.ok(brandSales.revenue > 0);

  const month = today.slice(0, 7);
  const baselineMonth = baseline.monthlySales.find((row) => row.month === month);
  const afterMonth = after.monthlySales.find((row) => row.month === month);
  const baselineSales = baselineMonth?.sales ?? 0;
  const baselineOrders = baselineMonth?.orders ?? 0;
  assert.equal(afterMonth.sales - baselineSales, expectedSales);
  assert.equal(afterMonth.orders - baselineOrders, countedOrders.length);

  await expectDenied(
    anon.rpc("phase8_analytics_report", { p_from: today, p_to: today }),
    "anonymous analytics",
  );
  await expectDenied(
    customerUser.client.rpc("phase8_analytics_report", { p_from: today, p_to: today }),
    "customer analytics",
  );
  const analyticsText = JSON.stringify(after);
  assert.doesNotMatch(analyticsText, /Audit Rahima|buyer-|enquiry@example\.test/);
  pass("analytics matches real orders and inventory and returns no customer identity");

  await expectDenied(
    anon.rpc("place_cod_order", {
      p_idempotency_key: randomUUID(),
      p_idempotency_fingerprint: fingerprint(buyer, lines, null),
      p_customer_id: null,
      p_customer_name: buyer.fullName,
      p_customer_phone: buyer.phone,
      p_customer_email: buyer.email,
      p_delivery_address: checkoutValidation.toCheckoutAddress(buyer),
      p_notes: null,
      p_items: lines,
      p_changed_by: null,
      p_coupon_code: null,
    }),
    "anonymous order placement",
  );
  await expectDenied(
    customerUser.client.rpc("phase8_analytics_report", {}),
    "customer analytics RPC",
  );
  pass("privileged RPCs remain denied to anonymous and customer sessions");

  if (keepData) writeFileSync(dataFile, `${JSON.stringify(browser, null, 2)}\n`);

  if (keepData) {
    console.log(
      "PHASE 8 AUDIT PASSED — browser data retained in .phase8-audit-data.json",
    );
  } else {
    const removed = await cleanupPhase8Data(browser);
    console.log("PHASE 8 AUDIT PASSED — data cleaned", JSON.stringify(removed));
  }
  finished = true;
} finally {
  if (!finished && !keepData) {
    const removed = await cleanupPhase8Data(browser);
    console.log("PHASE 8 AUDIT FAILED — throwaway data cleaned", JSON.stringify(removed));
  }
}
