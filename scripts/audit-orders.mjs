/**
 * Live Phase 7 order-management audit against a disposable Supabase project.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/audit-orders.mjs
 *
 * Creates throwaway users, catalogue rows and real COD orders, then verifies:
 * - the documented status lifecycle and database transition guards
 * - timestamped status history, including direct database writes
 * - privacy-safe tracking with strict order-number/phone verification
 * - cancellation request, duplicate request, rejection and approval
 * - exactly-once and concurrent-safe stock restoration
 * - RLS and RPC denials for anonymous, customer and non-admin sessions
 * - token-gated confirmation access
 *
 * Everything created by the audit is deleted at the end. Set
 * PHASE7_KEEP_DATA=1 to keep the rows and write .phase7-audit-data.json for
 * follow-up browser UI checks; a separate cleanup is then required.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import ts from "typescript";

function loadEnvFile() {
  const file = resolve(process.cwd(), ".env.local");
  if (!existsSync(file)) return;

  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

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

function makeCustomer({ name, phone, email }) {
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
  form.set("notes", "Phase 7 audit");
  return checkoutValidation.readCheckoutCustomer(form);
}

async function expectRpcError(promise, pattern) {
  const { error } = await promise;
  assert.ok(error, "the RPC was expected to fail");
  if (pattern) assert.match(error.message, pattern);
  return error;
}

async function expectEmpty(client, table, column, value) {
  const { data, error } = await client.from(table).select("id").eq(column, value);
  assert.ifError(error);
  assert.deepEqual(data, [], `${table} row must not be visible to this session`);
}

async function expectDenied(promise, label) {
  const { error } = await promise;
  assert.ok(error, `${label} must be denied`);
  return error;
}

loadEnvFile();

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
const keepData = process.env.PHASE7_KEEP_DATA === "1";
const created = {
  orderIds: [],
  productId: null,
  orphanProductId: null,
  brandId: null,
  categoryId: null,
  userIds: [],
};
const dataForBrowser = {
  suffix,
  credentials: {},
  ids: {},
  orders: {},
};

async function createUser(label, role = "customer") {
  const email = `order-audit-${label}-${suffix}@example.test`;
  const password = "OrderAudit123!";
  const { data: userData, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.ifError(error);
  created.userIds.push(userData.user.id);

  if (role !== "customer") {
    const { error: roleError } = await admin
      .from("profiles")
      .update({ role })
      .eq("id", userData.user.id);
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

  dataForBrowser.credentials[label] = { email, password, role, id: userData.user.id };
  return { id: userData.user.id, email, password, client: session };
}

try {
  const { data: brand, error: brandError } = await admin
    .from("brands")
    .insert({ name: `Order Audit Brand ${suffix}`, slug: `order-audit-brand-${suffix}` })
    .select("id")
    .single();
  assert.ifError(brandError);
  created.brandId = brand.id;

  const { data: category, error: categoryError } = await admin
    .from("categories")
    .insert({
      name: `Order Audit Category ${suffix}`,
      slug: `order-audit-category-${suffix}`,
    })
    .select("id")
    .single();
  assert.ifError(categoryError);
  created.categoryId = category.id;

  const { data: product, error: productError } = await admin
    .from("products")
    .insert({
      name: `Order Audit Product ${suffix}`,
      slug: `order-audit-product-${suffix}`,
      brand_id: brand.id,
      category_id: category.id,
      regular_price: 100000,
      sale_price: 90000,
      stock_quantity: 30,
      visual: "dropper",
      tone: "emerald",
    })
    .select("id, stock_quantity")
    .single();
  assert.ifError(productError);
  created.productId = product.id;

  dataForBrowser.ids = {
    brandId: brand.id,
    categoryId: category.id,
    productId: product.id,
  };

  const customerA = makeCustomer({
    name: "Audit Rahima",
    phone: "01712345678",
    email: `customer-a-${suffix}@example.test`,
  });
  const customerB = makeCustomer({
    name: "Audit Karim",
    phone: "01812345678",
    email: `customer-b-${suffix}@example.test`,
  });

  const userA = await createUser("customerA");
  const userB = await createUser("customerB");
  const adminUser = await createUser("admin", "admin");
  pass("throwaway catalogue and admin/customer users were created");

  const place = async (customer, quantity, customerId = null, note = "Phase 7 audit") => {
    const lines = [{ productId: product.id, quantity }];
    const { data, error } = await admin.rpc("place_cod_order", {
      p_idempotency_key: `${randomUUID()}-phase7-${quantity}`,
      p_idempotency_fingerprint: fingerprint(customer, lines),
      p_customer_id: customerId,
      p_customer_name: customer.fullName,
      p_customer_phone: customer.phone,
      p_customer_email: customer.email,
      p_delivery_address: checkoutValidation.toCheckoutAddress(customer),
      p_notes: note,
      p_items: lines,
      p_changed_by: null,
    });
    assert.ifError(error);
    created.orderIds.push(data.orderId);
    return data;
  };

  const getOrder = async (id) => {
    const { data, error } = await admin
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();
    assert.ifError(error);
    return data;
  };

  const getStock = async () => {
    const { data, error } = await admin
      .from("products")
      .select("stock_quantity")
      .eq("id", product.id)
      .single();
    assert.ifError(error);
    return data.stock_quantity;
  };

  const getHistory = async (orderId) => {
    const { data, error } = await admin
      .from("order_status_changes")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    assert.ifError(error);
    return data;
  };

  // 1: the documented lifecycle, idempotent updates and database guards.
  const lifecycleOrder = await place(customerA, 2, userA.id, "Lifecycle order");
  dataForBrowser.orders.lifecycle = {
    id: lifecycleOrder.orderId,
    orderNumber: lifecycleOrder.orderNumber,
  };
  const initialOrder = await getOrder(lifecycleOrder.orderId);
  assert.equal(initialOrder.order_status, "pending");
  assert.equal(initialOrder.customer_id, userA.id);
  assert.equal(await getStock(), 28);

  const sameStatus = await admin.rpc("set_order_status", {
    p_order_id: lifecycleOrder.orderId,
    p_status: "pending",
    p_actor_id: userA.id,
  });
  assert.ifError(sameStatus.error);
  assert.equal(sameStatus.data.changed, false);
  assert.equal((await getHistory(lifecycleOrder.orderId)).length, 1);
  pass("same-status admin update is a no-op without duplicate history");

  const { error: directInvalidError } = await admin
    .from("orders")
    .update({ order_status: "shipped" })
    .eq("id", lifecycleOrder.orderId);
  assert.ok(directInvalidError, "direct pending → shipped must be rejected");
  assert.match(directInvalidError.message, /Cannot change/i);
  pass("database trigger rejects an invalid direct status write");

  for (const status of ["confirmed", "processing", "shipped", "delivered"]) {
    const { error } = await admin.rpc("set_order_status", {
      p_order_id: lifecycleOrder.orderId,
      p_status: status,
      p_actor_id: adminUser.id,
      p_note: `Audit: ${status}`,
    });
    assert.ifError(error, `pending → ... → ${status} should succeed`);
    assert.equal((await getOrder(lifecycleOrder.orderId)).order_status, status);
  }
  pass("Pending → Confirmed → Processing → Shipped → Delivered succeeds");

  const history = await getHistory(lifecycleOrder.orderId);
  assert.deepEqual(
    history.map((entry) => entry.to_status),
    ["pending", "confirmed", "processing", "shipped", "delivered"],
  );
  assert.deepEqual(
    history.slice(1).map((entry) => entry.from_status),
    ["pending", "confirmed", "processing", "shipped"],
  );
  assert.ok(history.every((entry) => Boolean(entry.created_at)));
  assert.ok(history.slice(1).every((entry) => entry.actor_type === "admin"));
  assert.ok(history.slice(1).every((entry) => entry.actor_id === adminUser.id));
  assert.ok(history.slice(1).every((entry) => Boolean(entry.note)));
  pass("every status change has timestamped, actor-tagged history");

  const deliveredOrder = await getOrder(lifecycleOrder.orderId);
  assert.equal(deliveredOrder.payment_status, initialOrder.payment_status);
  assert.equal(deliveredOrder.total_amount, initialOrder.total_amount);
  assert.equal(deliveredOrder.subtotal, initialOrder.subtotal);
  assert.equal(await getStock(), 28, "fulfilment transitions must not touch stock");
  await expectRpcError(
    admin.rpc("set_order_status", {
      p_order_id: lifecycleOrder.orderId,
      p_status: "cancelled",
      p_actor_id: adminUser.id,
    }),
    /not allowed|Cannot change/i,
  );
  await expectRpcError(
    admin.rpc("request_order_cancellation", {
      p_order_number: lifecycleOrder.orderNumber,
      p_phone: customerA.phone,
      p_reason: "Too late",
    }),
    /no longer be cancelled/i,
  );
  pass("payment/totals are unchanged and terminal orders cannot be cancelled");

  // Direct valid writes are still audited by the database trigger.
  const directOrder = await place(customerA, 1, userA.id, "Direct write order");
  const { error: directValidError } = await admin
    .from("orders")
    .update({ order_status: "confirmed" })
    .eq("id", directOrder.orderId);
  assert.ifError(directValidError);
  const directHistory = await getHistory(directOrder.orderId);
  assert.deepEqual(
    directHistory.map((entry) => entry.to_status),
    ["pending", "confirmed"],
  );
  assert.ok(directHistory[1].created_at);
  pass("direct valid status writes also append a history row");

  // 2: tracking requires both secrets and returns a privacy-safe DTO.
  const tracked = await admin.rpc("track_order", {
    p_order_number: ` ${lifecycleOrder.orderNumber.toLowerCase()} `,
    p_phone: "+88 01712-345678",
  });
  assert.ifError(tracked.error);
  assert.equal(tracked.data.orderNumber, lifecycleOrder.orderNumber);
  assert.equal(tracked.data.status, "delivered");
  assert.equal(tracked.data.paymentMethod, "cash_on_delivery");
  assert.equal(tracked.data.estimatedDeliveryAt, null);
  assert.equal(tracked.data.courier.state, "not_connected");
  assert.equal(tracked.data.items[0].quantity, 2);
  for (const privateKey of [
    "customerName",
    "customerPhone",
    "customerEmail",
    "deliveryAddress",
    "totalAmount",
    "cancellationReason",
    "confirmationToken",
  ]) {
    assert.equal(tracked.data[privateKey], undefined, `${privateKey} must not leak`);
  }

  for (const [label, input] of [
    ["wrong phone", { p_order_number: lifecycleOrder.orderNumber, p_phone: "01812345678" }],
    ["wrong number", { p_order_number: "SD-20261127-XXXXXXXX", p_phone: customerA.phone }],
    ["another customer's phone", { p_order_number: lifecycleOrder.orderNumber, p_phone: customerB.phone }],
    ["malformed number", { p_order_number: "NOT-AN-ORDER", p_phone: customerA.phone }],
    ["malformed phone", { p_order_number: lifecycleOrder.orderNumber, p_phone: "12345" }],
  ]) {
    const result = await admin.rpc("track_order", input);
    assert.ifError(result.error);
    assert.equal(result.data, null, `${label} must not reveal an order`);
  }
  pass("tracking verifies both values and rejects malformed or mismatched input");

  // 3: customer request, duplicate guard, admin rejection, stock unchanged.
  const rejectedOrder = await place(customerB, 3, userB.id, "Rejection order");
  dataForBrowser.orders.rejected = {
    id: rejectedOrder.orderId,
    orderNumber: rejectedOrder.orderNumber,
  };
  const stockBeforeReject = await getStock();
  await expectRpcError(
    admin.rpc("request_order_cancellation", {
      p_order_number: rejectedOrder.orderNumber,
      p_phone: customerA.phone,
      p_reason: "Wrong customer",
    }),
    /no matching order/i,
  );
  const requestReject = await admin.rpc("request_order_cancellation", {
    p_order_number: rejectedOrder.orderNumber,
    p_phone: "+8801812345678",
    p_reason: "Ordered by mistake",
  });
  assert.ifError(requestReject.error);
  assert.equal(requestReject.data.alreadyRequested, false);
  assert.equal((await getOrder(rejectedOrder.orderId)).cancellation_status, "requested");

  const requestRowsBefore = await getHistory(rejectedOrder.orderId);
  const duplicateRequest = await admin.rpc("request_order_cancellation", {
    p_order_number: rejectedOrder.orderNumber,
    p_phone: customerB.phone,
    p_reason: "Again",
  });
  assert.ifError(duplicateRequest.error);
  assert.equal(duplicateRequest.data.alreadyRequested, true);
  assert.equal((await getHistory(rejectedOrder.orderId)).length, requestRowsBefore.length);
  pass("duplicate cancellation requests are idempotent");

  await expectRpcError(
    admin.rpc("set_order_status", {
      p_order_id: rejectedOrder.orderId,
      p_status: "confirmed",
      p_actor_id: adminUser.id,
    }),
    /Decide the pending cancellation request/i,
  );
  assert.equal((await getOrder(rejectedOrder.orderId)).order_status, "pending");
  assert.equal(
    (await getHistory(rejectedOrder.orderId)).length,
    requestRowsBefore.length,
    "a blocked status change must not create history",
  );
  pass("a pending request blocks status changes until it is decided");

  const { error: rejectError } = await admin.rpc("decide_order_cancellation", {
    p_order_id: rejectedOrder.orderId,
    p_approve: false,
    p_actor_id: adminUser.id,
    p_note: "Stock already reserved",
  });
  assert.ifError(rejectError);
  const rejected = await getOrder(rejectedOrder.orderId);
  assert.equal(rejected.order_status, "pending");
  assert.equal(rejected.cancellation_status, "rejected");
  assert.equal(rejected.cancellation_decided_by, adminUser.id);
  assert.equal(rejected.cancellation_stock_restored, false);
  assert.equal(await getStock(), stockBeforeReject, "rejection must not restore stock");
  const rejectedHistory = await getHistory(rejectedOrder.orderId);
  assert.ok(rejectedHistory.some((entry) => entry.actor_type === "customer"));
  assert.ok(
    rejectedHistory.some(
      (entry) => entry.note?.includes("Cancellation rejected") && entry.actor_type === "admin",
    ),
  );
  await expectRpcError(
    admin.rpc("request_order_cancellation", {
      p_order_number: rejectedOrder.orderNumber,
      p_phone: customerB.phone,
      p_reason: "Try again",
    }),
    /decision|can no longer/i,
  );
  await expectRpcError(
    admin.rpc("decide_order_cancellation", {
      p_order_id: rejectedOrder.orderId,
      p_approve: false,
      p_actor_id: adminUser.id,
    }),
    /no pending/i,
  );
  pass("customer request and admin rejection preserve status and stock");

  // 4: approval cancels once and restores stock exactly once.
  const cancelledOrder = await place(customerA, 4, userA.id, "Approval order");
  dataForBrowser.orders.cancelled = {
    id: cancelledOrder.orderId,
    orderNumber: cancelledOrder.orderNumber,
  };
  const stockBeforeApprove = await getStock();
  const requestApprove = await admin.rpc("request_order_cancellation", {
    p_order_number: cancelledOrder.orderNumber,
    p_phone: customerA.phone,
    p_reason: "No longer needed",
  });
  assert.ifError(requestApprove.error);
  const approve = await admin.rpc("decide_order_cancellation", {
    p_order_id: cancelledOrder.orderId,
    p_approve: true,
    p_actor_id: adminUser.id,
    p_note: "Approved by audit",
  });
  assert.ifError(approve.error);
  assert.equal(approve.data.decision, "approved");
  assert.equal(approve.data.status, "cancelled");

  const cancelled = await getOrder(cancelledOrder.orderId);
  assert.equal(cancelled.order_status, "cancelled");
  assert.equal(cancelled.cancellation_status, "approved");
  assert.equal(cancelled.cancellation_decided_by, adminUser.id);
  assert.equal(cancelled.cancellation_stock_restored, true);
  assert.equal(await getStock(), stockBeforeApprove + 4);

  const restoreRows = await admin
    .from("inventory_changes")
    .select("reason, delta")
    .eq("product_id", product.id)
    .eq("reason", "cancellation_restore");
  assert.ifError(restoreRows.error);
  assert.equal(restoreRows.data.length, 1);
  assert.equal(restoreRows.data[0].delta, 4);

  await admin.rpc("set_order_status", {
    p_order_id: cancelledOrder.orderId,
    p_status: "cancelled",
    p_actor_id: adminUser.id,
  });
  await admin.rpc("restore_cancelled_order_stock", {
    p_order_id: cancelledOrder.orderId,
    p_actor_id: adminUser.id,
  });
  assert.equal(await getStock(), stockBeforeApprove + 4);
  const restoreRowsAgain = await admin
    .from("inventory_changes")
    .select("id")
    .eq("product_id", product.id)
    .eq("reason", "cancellation_restore");
  assert.equal(restoreRowsAgain.data.length, 1);
  await expectRpcError(
    admin.rpc("set_order_status", {
      p_order_id: cancelledOrder.orderId,
      p_status: "confirmed",
      p_actor_id: adminUser.id,
    }),
    /not allowed|Cannot change/i,
  );
  pass("approval restores stock once and cancellation remains terminal");

  // Concurrent approvals must not double-restore.
  const concurrentOrder = await place(customerA, 1, userA.id, "Concurrent cancellation");
  const stockBeforeConcurrent = await getStock();
  await admin.rpc("request_order_cancellation", {
    p_order_number: concurrentOrder.orderNumber,
    p_phone: customerA.phone,
    p_reason: "Concurrent approval test",
  });
  // supabase-js resolves RPC errors in the response instead of rejecting, so
  // both network calls settle; exactly one database call may succeed.
  const outcomes = await Promise.all([
    admin.rpc("decide_order_cancellation", {
      p_order_id: concurrentOrder.orderId,
      p_approve: true,
      p_actor_id: adminUser.id,
    }),
    admin.rpc("decide_order_cancellation", {
      p_order_id: concurrentOrder.orderId,
      p_approve: true,
      p_actor_id: adminUser.id,
    }),
  ]);
  assert.equal(outcomes.filter((outcome) => !outcome.error).length, 1);
  assert.equal(outcomes.filter((outcome) => outcome.error).length, 1);
  assert.match(
    outcomes.find((outcome) => outcome.error).error.message,
    /no pending/i,
  );
  assert.equal(await getStock(), stockBeforeConcurrent + 1);
  const concurrentRestores = await admin
    .from("inventory_changes")
    .select("id, delta")
    .eq("product_id", product.id)
    .eq("reason", "cancellation_restore")
    .eq("delta", 1);
  assert.equal(concurrentRestores.data.length, 1);
  pass("concurrent approvals restore stock only once");

  // 5: audit fixes found during review.
  const directCancelOrder = await place(customerA, 1, userA.id, "Direct admin cancellation");
  const stockBeforeDirect = await getStock();
  const { count: directRestoresBefore } = await admin
    .from("inventory_changes")
    .select("id", { count: "exact", head: true })
    .eq("product_id", product.id)
    .eq("reason", "cancellation_restore")
    .eq("delta", 1);
  const directResult = await admin.rpc("set_order_status", {
    p_order_id: directCancelOrder.orderId,
    p_status: "cancelled",
    p_actor_id: adminUser.id,
    p_note: "Admin decision",
  });
  assert.ifError(directResult.error);
  const directRow = await getOrder(directCancelOrder.orderId);
  assert.equal(directRow.order_status, "cancelled");
  assert.equal(directRow.cancellation_status, "none");
  assert.equal(directRow.cancellation_requested_at, null);
  assert.equal(directRow.cancellation_decided_at, null);
  assert.equal(directRow.cancellation_decided_by, null);
  assert.equal(directRow.cancellation_stock_restored, true);
  assert.equal(await getStock(), stockBeforeDirect + 1);
  assert.equal(
    (await getHistory(directCancelOrder.orderId)).some(
      (entry) => entry.actor_type === "customer",
    ),
    false,
  );
  const { count: directRestoresAfter } = await admin
    .from("inventory_changes")
    .select("id", { count: "exact", head: true })
    .eq("product_id", product.id)
    .eq("reason", "cancellation_restore")
    .eq("delta", 1);
  assert.equal(directRestoresAfter, directRestoresBefore + 1);
  pass("direct admin cancellation does not fabricate a customer request");

  const orphanCustomer = makeCustomer({
    name: "Audit Orphan",
    phone: "01912345678",
    email: `orphan-${suffix}@example.test`,
  });
  const { data: orphanProduct, error: orphanProductError } = await admin
    .from("products")
    .insert({
      name: `Order Audit Orphan ${suffix}`,
      slug: `order-audit-orphan-${suffix}`,
      brand_id: brand.id,
      category_id: category.id,
      regular_price: 50000,
      sale_price: 45000,
      stock_quantity: 5,
      visual: "dropper",
      tone: "emerald",
    })
    .select("id")
    .single();
  assert.ifError(orphanProductError);
  created.orphanProductId = orphanProduct.id;

  const orphanLines = [{ productId: orphanProduct.id, quantity: 2 }];
  const { data: orphanOrder, error: orphanOrderError } = await admin.rpc(
    "place_cod_order",
    {
      p_idempotency_key: `${randomUUID()}-phase7-orphan`,
      p_idempotency_fingerprint: fingerprint(orphanCustomer, orphanLines),
      p_customer_id: userA.id,
      p_customer_name: orphanCustomer.fullName,
      p_customer_phone: orphanCustomer.phone,
      p_customer_email: orphanCustomer.email,
      p_delivery_address: checkoutValidation.toCheckoutAddress(orphanCustomer),
      p_notes: "Deleted product cancellation",
      p_items: orphanLines,
      p_changed_by: null,
    },
  );
  assert.ifError(orphanOrderError);
  created.orderIds.push(orphanOrder.orderId);

  const { error: deleteProductError } = await admin
    .from("products")
    .delete()
    .eq("id", orphanProduct.id);
  assert.ifError(deleteProductError);
  const orphanRequest = await admin.rpc("request_order_cancellation", {
    p_order_number: orphanOrder.orderNumber,
    p_phone: orphanCustomer.phone,
    p_reason: "Test deleted product",
  });
  assert.ifError(orphanRequest.error);
  await expectRpcError(
    admin.rpc("decide_order_cancellation", {
      p_order_id: orphanOrder.orderId,
      p_approve: true,
      p_actor_id: adminUser.id,
    }),
    /no longer available/i,
  );
  const orphanAfter = await getOrder(orphanOrder.orderId);
  assert.equal(orphanAfter.order_status, "pending");
  assert.equal(orphanAfter.cancellation_status, "requested");
  assert.equal(orphanAfter.cancellation_stock_restored, false);
  assert.equal(
    (await getHistory(orphanOrder.orderId)).some((entry) => entry.to_status === "cancelled"),
    false,
  );
  pass("a deleted product aborts restoration instead of losing stock");

  // 6: RLS and RPC authorization with real authenticated sessions.
  const ownOrders = await userA.client
    .from("orders")
    .select("id")
    .eq("id", lifecycleOrder.orderId);
  assert.ifError(ownOrders.error);
  assert.equal(ownOrders.data.length, 1, "a customer can read their own order");
  await expectEmpty(userA.client, "orders", "id", rejectedOrder.orderId);
  await expectEmpty(userA.client, "order_items", "order_id", rejectedOrder.orderId);
  await expectDenied(
    anon.from("orders").select("id").eq("id", lifecycleOrder.orderId),
    "anonymous order read",
  );
  await expectDenied(
    anon.from("order_items").select("id").eq("order_id", lifecycleOrder.orderId),
    "anonymous order-item read",
  );
  pass("RLS hides other customers' orders/items and blocks anonymous reads");

  await expectEmpty(
    userA.client,
    "order_status_changes",
    "order_id",
    lifecycleOrder.orderId,
  );
  await expectEmpty(userA.client, "courier_shipments", "order_id", lifecycleOrder.orderId);
  const adminHistory = await adminUser.client
    .from("order_status_changes")
    .select("id")
    .eq("order_id", lifecycleOrder.orderId);
  assert.ifError(adminHistory.error);
  assert.equal(adminHistory.data.length, 5, "admin session can read status history");
  const adminShipments = await adminUser.client
    .from("courier_shipments")
    .select("id")
    .eq("order_id", lifecycleOrder.orderId);
  assert.ifError(adminShipments.error);
  pass("status history and courier rows are admin-only");

  const protectedRpcs = [
    ["track_order", { p_order_number: lifecycleOrder.orderNumber, p_phone: customerA.phone }],
    ["set_order_status", { p_order_id: rejectedOrder.orderId, p_status: "confirmed", p_actor_id: null }],
    ["request_order_cancellation", { p_order_number: rejectedOrder.orderId, p_phone: customerB.phone, p_reason: "Denied" }],
    ["decide_order_cancellation", { p_order_id: rejectedOrder.orderId, p_approve: true, p_actor_id: null }],
    ["restore_cancelled_order_stock", { p_order_id: cancelledOrder.orderId, p_actor_id: null }],
  ];
  for (const [name, args] of protectedRpcs) {
    await expectDenied(anon.rpc(name, args), `anonymous ${name}`);
    await expectDenied(userA.client.rpc(name, args), `customer ${name}`);
  }
  pass("order RPCs reject anonymous and customer callers");

  // The confirmation URL remains protected by its secret token.
  const confirmationRow = await getOrder(lifecycleOrder.orderId);
  const wrongToken = await anon.rpc("get_order_confirmation", {
    p_order_number: lifecycleOrder.orderNumber,
    p_confirmation_token: "wrong-token",
  });
  assert.ifError(wrongToken.error);
  assert.equal(wrongToken.data, null);
  const correctToken = await anon.rpc("get_order_confirmation", {
    p_order_number: lifecycleOrder.orderNumber,
    p_confirmation_token: confirmationRow.confirmation_token,
  });
  assert.ifError(correctToken.error);
  assert.equal(correctToken.data.orderNumber, lifecycleOrder.orderNumber);
  assert.equal(correctToken.data.id, lifecycleOrder.orderId);
  pass("confirmation data requires the exact secret token");

  if (keepData) {
    const path = resolve(process.cwd(), ".phase7-audit-data.json");
    writeFileSync(path, JSON.stringify(dataForBrowser, null, 2));
    console.log(`KEPT  throwaway audit data for browser checks: ${path}`);
  } else {
    console.log("ALL LIVE ORDER AUDIT CHECKS PASSED");
  }
} finally {
  if (!keepData) {
    for (const orderId of created.orderIds) {
      await admin.from("orders").delete().eq("id", orderId);
    }
    for (const productId of [created.productId, created.orphanProductId]) {
      if (!productId) continue;
      await admin
        .from("inventory_changes")
        .delete()
        .eq("product_id", productId);
      await admin.from("products").delete().eq("id", productId);
    }
    if (created.brandId) {
      await admin.from("brands").delete().eq("id", created.brandId);
    }
    if (created.categoryId) {
      await admin.from("categories").delete().eq("id", created.categoryId);
    }
    for (const userId of created.userIds) {
      await admin.auth.admin.deleteUser(userId);
    }
  }
}
