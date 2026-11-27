import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import ts from "typescript";

/**
 * Loads pure TypeScript helpers without a build step. These modules use only
 * type-only imports, so transpilation produces self-contained CommonJS.
 */
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
  const blockedRequire = () => {
    throw new Error(`Unexpected runtime import in ${relativePath}`);
  };

  new Function(
    "exports",
    "require",
    "module",
    "__filename",
    "__dirname",
    outputText,
  )(
    moduleRecord.exports,
    blockedRequire,
    moduleRecord,
    filename,
    resolve(filename, ".."),
  );

  return moduleRecord.exports;
}

const orderStatus = loadTs("lib/order-status.ts");
const orderTracking = loadTs("lib/order-tracking.ts");
const courier = loadTs("lib/courier.ts");

function read(relativePath) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function grantsFor(functionName, source) {
  const needle = `grant execute on function ${functionName}`;
  let from = 0;
  const matches = [];

  while (true) {
    const start = source.indexOf(needle, from);
    if (start < 0) break;
    const end = source.indexOf(";", start);
    matches.push(source.slice(start, end + 1));
    from = end + 1;
  }

  return matches.join("\n");
}

test("the six documented statuses have a forward-only lifecycle", () => {
  assert.deepEqual(orderStatus.ORDER_STATUSES, [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ]);
  assert.deepEqual(orderStatus.LEGACY_ORDER_STATUSES, ["returned"]);

  const lifecycle = ["pending", "confirmed", "processing", "shipped", "delivered"];
  for (let index = 0; index < lifecycle.length - 1; index += 1) {
    assert.equal(
      orderStatus.canChangeOrderStatus(lifecycle[index], lifecycle[index + 1]),
      true,
      `${lifecycle[index]} → ${lifecycle[index + 1]} must be allowed`,
    );
    assert.equal(
      orderStatus.canChangeOrderStatus(lifecycle[index + 1], lifecycle[index]),
      false,
      "the lifecycle cannot move backwards",
    );
  }

  assert.equal(orderStatus.canChangeOrderStatus("pending", "cancelled"), true);
  assert.equal(orderStatus.canChangeOrderStatus("confirmed", "cancelled"), true);
  assert.equal(orderStatus.canChangeOrderStatus("processing", "cancelled"), true);
  assert.equal(orderStatus.canChangeOrderStatus("shipped", "cancelled"), false);
  assert.equal(orderStatus.canChangeOrderStatus("delivered", "cancelled"), false);
  assert.deepEqual(orderStatus.getAllowedOrderStatuses("delivered"), []);
  assert.deepEqual(orderStatus.getAllowedOrderStatuses("cancelled"), []);
  assert.deepEqual(orderStatus.getAllowedOrderStatuses("returned"), []);
  assert.equal(orderStatus.canChangeOrderStatus("shipped", "returned"), false);
  assert.equal(orderStatus.isOrderStatus("returned"), true, "legacy rows remain readable");
  assert.equal(orderStatus.isOrderStatus("unknown"), false);
});

test("tracking input is normalised and validates both secrets", () => {
  assert.equal(
    orderTracking.normalizeOrderNumber(" sd-20261127-ab12cd34 "),
    "SD-20261127-AB12CD34",
  );
  assert.equal(orderTracking.isValidOrderNumber("SD-20261127-AB12CD34"), true);
  assert.equal(orderTracking.isValidOrderNumber("SD-20261127-ab12cd34"), false);
  assert.equal(
    orderTracking.normalizeBangladeshPhone("+880 1712-345678"),
    "01712345678",
  );
  assert.equal(orderTracking.normalizeBangladeshPhone("01712345678"), "01712345678");
  assert.equal(orderTracking.normalizeBangladeshPhone("12345"), "");
  assert.equal(orderTracking.normalizeBangladeshPhone("01212345678"), "");

  assert.deepEqual(
    orderTracking.readTrackingInput({
      orderNumber: "sd-20261127-ab12cd34",
      phone: "+8801712345678",
    }),
    { orderNumber: "SD-20261127-AB12CD34", phone: "01712345678" },
  );
  assert.throws(
    () => orderTracking.readTrackingInput({ orderNumber: "nope", phone: "123" }),
    (error) =>
      error instanceof orderTracking.TrackingValidationError &&
      Boolean(error.fieldErrors.orderNumber) &&
      Boolean(error.fieldErrors.phone),
  );
});

test("customers may only request cancellation before shipment and once", () => {
  for (const status of ["pending", "confirmed", "processing"]) {
    assert.equal(
      orderTracking.canCustomerRequestCancellation(status, "none"),
      true,
    );
  }
  assert.equal(
    orderTracking.canCustomerRequestCancellation("shipped", "none"),
    false,
  );
  assert.equal(
    orderTracking.canCustomerRequestCancellation("pending", "requested"),
    false,
  );
  assert.equal(
    orderTracking.canCustomerRequestCancellation("pending", "rejected"),
    false,
  );
});

test("courier registry is ready but has no active provider", () => {
  assert.deepEqual(
    courier.COURIER_ADAPTERS.map((adapter) => adapter.provider),
    ["pathao", "steadfast", "redx"],
  );
  assert.equal(courier.COURIER_ADAPTERS.every((adapter) => !adapter.enabled), true);
  assert.deepEqual(courier.getEnabledCourierAdapters(), []);
  assert.equal(courier.isCourierConnected(), false);
});

test("Phase 7 migration logs transitions and guards stock restoration", () => {
  const migration = read("supabase/migrations/0008_phase7_orders.sql");

  assert.match(migration, /create table if not exists public\.order_status_changes/);
  assert.match(migration, /create table if not exists public\.courier_shipments/);
  assert.match(migration, /cancellation_stock_restored boolean not null default false/);
  assert.match(migration, /after insert or update of order_status on public\.orders/);
  assert.match(migration, /before insert or update of order_status on public\.orders/);
  assert.match(migration, /orders_enforce_status_transition/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /for update/);
  assert.match(migration, /if v_order\.cancellation_stock_restored then\s*return;/);
  assert.match(migration, /'cancellation_restore'/);
  assert.match(
    migration,
    /upper\(btrim\(order_number\)\) = v_number[\s\S]*regexp_replace\(customer_phone/,
  );

  const functions = [
    "public.set_order_status(uuid, text, uuid, text)",
    "public.request_order_cancellation(text, text, text)",
    "public.decide_order_cancellation(uuid, boolean, uuid, text)",
    "public.track_order(text, text)",
  ];
  for (const name of functions) {
    const grants = grantsFor(name, migration);
    assert.match(grants, /to service_role/, `${name} must be executable by service_role`);
    assert.doesNotMatch(grants, /to anon|to authenticated/, `${name} must not be public`);
  }

  const trackBody = migration.slice(
    migration.indexOf("create or replace function public.track_order"),
    migration.indexOf("Metadata-only report"),
  );
  assert.doesNotMatch(trackBody, /cancellation_decision_note/);
  assert.doesNotMatch(trackBody, /customer_name|customer_email|total_amount/);
  assert.match(trackBody, /estimated_delivery_at/);

  const fixes = read("supabase/migrations/0009_order_audit_fixes.sql");
  assert.match(fixes, /Decide the pending cancellation request/);
  assert.match(
    fixes,
    /v_order\.cancellation_status = 'requested' and p_status <> 'cancelled'/,
  );
  assert.match(
    fixes,
    /when p_status = 'cancelled' and v_order\.cancellation_status = 'none'\s*then 'none'/,
    "admin cancellation must not fabricate a customer request",
  );
  assert.match(
    fixes,
    /if v_item\.product_id is null then/,
    "missing products must abort restoration",
  );
  for (const name of [
    "public.set_order_status(uuid, text, uuid, text)",
    "public.restore_cancelled_order_stock(uuid, uuid)",
  ]) {
    const grants = grantsFor(name, fixes);
    assert.match(grants, /to service_role/);
    assert.doesNotMatch(grants, /to anon|to authenticated/);
  }
});

test("Phase 7 UI shows required order fields and never exposes private tracking data", () => {
  const list = read("app/admin/(panel)/orders/page.tsx");
  for (const label of [
    "Order",
    "Customer",
    "Phone",
    "Total",
    "Payment method",
    "Payment status",
    "Order status",
    "Order date",
  ]) {
    assert.match(list, new RegExp(`>${label}<`), `admin list is missing ${label}`);
  }

  const detail = read("app/admin/(panel)/orders/[id]/page.tsx");
  for (const label of [
    "Order status",
    "Payment method",
    "Payment status",
    "Customer",
    "Delivery address",
    "Purchased products",
    "Subtotal",
    "Delivery charge",
    "Discount",
    "Final total",
    "Status history",
  ]) {
    assert.match(detail, new RegExp(`"${label}"`), `detail page is missing ${label}`);
  }

  const trackingPage = read("app/(storefront)/track-order/page.tsx");
  assert.match(trackingPage, /robots: \{ index: false, follow: false \}/);

  const trackingService = read("services/order-tracking.ts");
  assert.doesNotMatch(
    trackingService,
    /confirmation_token|customer_name|customer_email|delivery_address|total_amount/,
  );

  const trackingForm = read("components/orders/track-order-form.tsx");
  assert.match(
    trackingForm,
    /cancelState\.order \?\? trackState\.order/,
    "a successful cancellation request refreshes the visible order",
  );
  const cancellationState = read(
    "app/(storefront)/track-order/track-order-state.ts",
  );
  assert.match(cancellationState, /order: TrackedOrder \| null/);
  const actions = read("app/(storefront)/track-order/actions.ts");
  assert.match(actions, /order: result\.order/);

  const statusControl = read("components/admin/order-status-control.tsx");
  assert.match(statusControl, /cancellationStatus: CancellationStatus/);
  assert.match(
    statusControl,
    /decisionRequired \|\| allowedStatuses\.length === 0/,
    "the status control is disabled while a cancellation is pending",
  );

  const orderService = read("services/orders.ts");
  assert.match(
    orderService,
    /fullName: toString\(record\.fullName\) \|\| toString\(row\?\.customer_name\)/,
    "admin names fall back to the authoritative order column",
  );
  assert.match(
    orderService,
    /phone: toString\(record\.phone\) \|\| toString\(row\?\.customer_phone\)/,
    "admin phones fall back to the authoritative order column",
  );
});
