/**
 * Live checkout audit against a Supabase project.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/audit-checkout.mjs
 *
 * Creates throwaway catalogue rows, places real COD orders through the same
 * database function used by the application, verifies the resulting rows and
 * stock movements, then removes everything it created.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";
import ts from "typescript";

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
  new Function("exports", "require", "module", outputText)(
    moduleRecord.exports,
    () => {
      throw new Error(`Unexpected runtime import in ${relativePath}`);
    },
    moduleRecord,
  );
  return moduleRecord.exports;
}

const cartState = loadTs("lib/cart-state.ts");
const checkoutTotals = loadTs("lib/checkout-totals.ts");
const checkoutValidation = loadTs("lib/checkout-validation.ts");

function fingerprint(customer, lines) {
  const canonical = {
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

function customerForm() {
  const form = new FormData();
  form.set("fullName", "Audit Rahima");
  form.set("phone", "+88 01712-345678");
  form.set("email", "audit@example.test");
  form.set("division", "Dhaka");
  form.set("district", "Dhaka");
  form.set("upazila", "Gulshan");
  form.set("addressLine1", "House 10, Road 5, Gulshan 2");
  form.set("addressLine2", "");
  form.set("postalCode", "1212");
  form.set("notes", "Audit order");
  return form;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && anonKey && serviceKey, "Supabase credentials are required");

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const publicClient = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const pass = (message) => console.log(`PASS  ${message}`);
const suffix = randomUUID().slice(0, 8);
const created = { orderIds: [], productId: null, brandId: null, categoryId: null };
let originalCharge = null;

try {
  // 1–4: cart and totals helpers.
  const product = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Audit Serum",
    slug: "audit-serum",
    price: 125000,
    stockQuantity: 5,
  };
  let items = cartState.addCartItem([], product, 3);
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 3);
  items = cartState.addCartItem(items, product, 4);
  assert.equal(items[0].quantity, 5, "adding past stock clamps to stock");
  items = cartState.setCartItemQuantity(items, product.id, 2);
  assert.equal(items[0].quantity, 2);
  items = cartState.setCartItemQuantity(items, product.id, 0);
  assert.equal(items.length, 0, "zero quantity removes the line");
  items = cartState.addCartItem([], product, 2);
  items = cartState.removeCartItem(items, product.id);
  assert.equal(items.length, 0);
  assert.deepEqual(
    checkoutTotals.calculateQuoteTotals(
      [{ unitPrice: 125000, quantity: 2 }],
      7500,
      0,
    ),
    { subtotal: 250000, total: 257500, totalQuantity: 2 },
  );
  pass("add, remove, quantity changes and poisha totals");

  // 5: customer details.
  const customer = checkoutValidation.readCheckoutCustomer(customerForm());
  assert.equal(customer.phone, "01712345678");
  const badForm = customerForm();
  badForm.set("phone", "12345");
  badForm.set("addressLine1", "short");
  assert.throws(() => checkoutValidation.readCheckoutCustomer(badForm));
  pass("customer field validation");

  // Seed throwaway catalogue data.
  const { data: brand, error: brandError } = await admin
    .from("brands")
    .insert({ name: `Audit Brand ${suffix}`, slug: `audit-brand-${suffix}` })
    .select("id")
    .single();
  assert.ifError(brandError);
  created.brandId = brand.id;

  const { data: category, error: categoryError } = await admin
    .from("categories")
    .insert({ name: `Audit Category ${suffix}`, slug: `audit-category-${suffix}` })
    .select("id")
    .single();
  assert.ifError(categoryError);
  created.categoryId = category.id;

  const { data: testProduct, error: productError } = await admin
    .from("products")
    .insert({
      name: `Audit Product ${suffix}`,
      slug: `audit-product-${suffix}`,
      brand_id: brand.id,
      category_id: category.id,
      regular_price: 125000,
      sale_price: 120000,
      stock_quantity: 5,
      visual: "dropper",
      tone: "emerald",
    })
    .select("id, stock_quantity, sale_price")
    .single();
  assert.ifError(productError);
  created.productId = testProduct.id;
  const initialStock = testProduct.stock_quantity;

  const { data: currentSetting, error: settingReadError } = await admin
    .from("store_settings")
    .select("value")
    .eq("key", "delivery_charge_poisha")
    .single();
  assert.ifError(settingReadError);
  originalCharge = currentSetting.value;
  assert.ifError(
    (await admin
      .from("store_settings")
      .update({ value: 7500 })
      .eq("key", "delivery_charge_poisha")).error,
  );

  const { data: settings, error: settingsError } = await publicClient.rpc(
    "get_checkout_settings",
  );
  assert.ifError(settingsError);
  assert.equal(settings.deliveryCharge, 7500);
  pass("public quote settings read the admin delivery charge");

  const lines = [{ productId: testProduct.id, quantity: 2 }];
  const address = checkoutValidation.toCheckoutAddress(customer);
  const key = `${randomUUID()}-audit`;
  const place = (idempotencyKey, fingerprintValue, quantity = 2) =>
    admin.rpc("place_cod_order", {
      p_idempotency_key: idempotencyKey,
      p_idempotency_fingerprint: fingerprintValue,
      p_customer_id: null,
      p_customer_name: customer.fullName,
      p_customer_phone: customer.phone,
      p_customer_email: customer.email,
      p_delivery_address: address,
      p_notes: customer.notes,
      p_items: [{ productId: testProduct.id, quantity }],
      p_changed_by: null,
    });

  // 6: place a COD order.
  const { data: result, error: placeError } = await place(key, fingerprint(customer, lines));
  assert.ifError(placeError);
  created.orderIds.push(result.orderId);
  assert.match(result.orderNumber, /^SD-\d{8}-[A-F0-9]{8}$/);
  assert.equal(result.confirmationToken.length, 64);
  assert.equal(result.subtotal, 240000);
  assert.equal(result.deliveryCharge, 7500);
  assert.equal(result.total, 247500);
  pass("COD order placement returns server-calculated totals");

  // 7: order record.
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("*")
    .eq("id", result.orderId)
    .single();
  assert.ifError(orderError);
  assert.equal(order.order_number, result.orderNumber);
  assert.equal(order.customer_name, "Audit Rahima");
  assert.equal(order.customer_phone, "01712345678");
  assert.equal(order.customer_email, "audit@example.test");
  assert.equal(order.payment_method, "cash_on_delivery");
  assert.equal(order.payment_status, "unpaid");
  assert.equal(order.order_status, "pending");
  assert.equal(order.delivery_address.upazila, "Gulshan");
  assert.equal(order.idempotency_key, key);
  assert.equal(order.idempotency_fingerprint, fingerprint(customer, lines));
  assert.equal(order.total_amount, 247500);
  pass("order record stores customer, address, payment and totals");

  // 8: order items.
  const { data: orderItems, error: itemsError } = await admin
    .from("order_items")
    .select("*")
    .eq("order_id", order.id);
  assert.ifError(itemsError);
  assert.equal(orderItems.length, 1);
  assert.equal(orderItems[0].product_id, testProduct.id);
  assert.equal(orderItems[0].product_name, `Audit Product ${suffix}`);
  assert.equal(orderItems[0].unit_price, 120000);
  assert.equal(orderItems[0].quantity, 2);
  assert.equal(orderItems[0].total_price, 240000);
  pass("order item uses the authoritative sale price and quantity");

  // 9: stock reduction and inventory history.
  const { data: afterStockRow, error: stockError } = await admin
    .from("products")
    .select("stock_quantity")
    .eq("id", testProduct.id)
    .single();
  assert.ifError(stockError);
  assert.equal(afterStockRow.stock_quantity, initialStock - 2);

  const { data: movements, error: movementError } = await admin
    .from("inventory_changes")
    .select("previous_quantity, new_quantity, delta, reason")
    .eq("product_id", testProduct.id)
    .order("created_at", { ascending: true });
  assert.ifError(movementError);
  assert.equal(movements.length, 1);
  assert.deepEqual(
    {
      previous: movements[0].previous_quantity,
      next: movements[0].new_quantity,
      delta: movements[0].delta,
      reason: movements[0].reason,
    },
    { previous: 5, next: 3, delta: -2, reason: "order_placed" },
  );
  pass("stock is debited once and an order_placed history row is written");

  // Confirmation access is token-gated.
  const { data: confirmed, error: confirmError } = await publicClient.rpc(
    "get_order_confirmation",
    {
      p_order_number: result.orderNumber,
      p_confirmation_token: result.confirmationToken,
    },
  );
  assert.ifError(confirmError);
  assert.equal(confirmed.customerName, "Audit Rahima");
  assert.equal(confirmed.items.length, 1);
  const { data: denied } = await publicClient.rpc("get_order_confirmation", {
    p_order_number: result.orderNumber,
    p_confirmation_token: "0".repeat(64),
  });
  assert.equal(denied, null);
  pass("confirmation requires the matching secret token");

  // Anonymous clients cannot place orders or read protected tables.
  const { error: anonPlaceError } = await publicClient.rpc("place_cod_order", {
    p_idempotency_key: `${randomUUID()}-anon`,
    p_idempotency_fingerprint: fingerprint(customer, lines),
    p_customer_id: null,
    p_customer_name: customer.fullName,
    p_customer_phone: customer.phone,
    p_customer_email: customer.email,
    p_delivery_address: address,
    p_notes: customer.notes,
    p_items: lines,
    p_changed_by: null,
  });
  assert.ok(anonPlaceError, "anon must not execute the order RPC");
  const { data: anonSettings } = await publicClient
    .from("store_settings")
    .select("key");
  assert.deepEqual(anonSettings ?? [], [], "anon must not read store_settings");
  pass("anonymous order placement and settings reads are denied");

  // 11: duplicate submission with the same key is idempotent.
  const { data: replay, error: replayError } = await place(
    key,
    fingerprint(customer, lines),
  );
  assert.ifError(replayError);
  assert.equal(replay.orderId, result.orderId);
  assert.equal(replay.orderNumber, result.orderNumber);
  const orderCount = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("idempotency_key", key);
  assert.equal(orderCount.count, 1);
  const { data: stockAfterReplay } = await admin
    .from("products")
    .select("stock_quantity")
    .eq("id", testProduct.id)
    .single();
  assert.equal(stockAfterReplay.stock_quantity, initialStock - 2);
  pass("replaying the same key returns the original order without changes");

  // 11: reusing the key with different details is rejected.
  const { error: changedError } = await place(
    key,
    fingerprint(customer, [{ productId: testProduct.id, quantity: 1 }]),
  );
  assert.ok(changedError, "a changed fingerprint must be rejected");
  assert.match(changedError.message, /different details/i);
  pass("idempotency key reuse with changed details is rejected");

  // 10: overselling is prevented and leaves no partial order.
  const orderCountBefore = await admin
    .from("orders")
    .select("id", { count: "exact", head: true });
  const { error: oversellError } = await place(
    `${randomUUID()}-oversell`,
    fingerprint(customer, lines),
    99,
  );
  assert.ok(oversellError, "requesting more than stock must fail");
  assert.match(oversellError.message, /insufficient stock/i);
  const orderCountAfter = await admin
    .from("orders")
    .select("id", { count: "exact", head: true });
  assert.equal(orderCountAfter.count, orderCountBefore.count);
  const { data: stockAfterOversell } = await admin
    .from("products")
    .select("stock_quantity")
    .eq("id", testProduct.id)
    .single();
  assert.equal(stockAfterOversell.stock_quantity, initialStock - 2);
  pass("overselling is rejected atomically without stock or order changes");

  // Concurrent double submission of the same attempt must still be one order.
  const concurrentKey = `${randomUUID()}-concurrent`;
  const concurrentFingerprint = fingerprint(customer, lines);
  const [firstAttempt, secondAttempt] = await Promise.all([
    place(concurrentKey, concurrentFingerprint, 3),
    place(concurrentKey, concurrentFingerprint, 3),
  ]);
  assert.ifError(firstAttempt.error);
  assert.ifError(secondAttempt.error, "concurrent replay must return the first order");
  assert.equal(firstAttempt.data.orderId, secondAttempt.data.orderId);
  created.orderIds.push(firstAttempt.data.orderId);
  const concurrentCount = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("idempotency_key", concurrentKey);
  assert.equal(concurrentCount.count, 1);
  pass("concurrent double submission creates exactly one order");

  console.log("ALL LIVE CHECKOUT AUDIT CHECKS PASSED");
} finally {
  if (originalCharge !== null) {
    await admin
      .from("store_settings")
      .update({ value: originalCharge })
      .eq("key", "delivery_charge_poisha");
  }
  for (const orderId of created.orderIds) {
    await admin.from("orders").delete().eq("id", orderId);
  }
  if (created.productId) {
    await admin.from("inventory_changes").delete().eq("product_id", created.productId);
    await admin.from("products").delete().eq("id", created.productId);
  }
  if (created.brandId) {
    await admin.from("brands").delete().eq("id", created.brandId);
  }
  if (created.categoryId) {
    await admin.from("categories").delete().eq("id", created.categoryId);
  }
}
