import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import ts from "typescript";

/**
 * Loads the pure TypeScript helpers used by checkout without a separate build
 * step. Only type-only imports are used by these modules, so transpilation
 * produces self-contained CommonJS that can be evaluated here.
 */
function loadTs(relativePath) {
  const filename = resolve(process.cwd(), relativePath);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
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
    dirname(filename),
  );

  return moduleRecord.exports;
}

const cartState = loadTs("lib/cart-state.ts");
const checkoutTotals = loadTs("lib/checkout-totals.ts");
const checkoutValidation = loadTs("lib/checkout-validation.ts");
const paymentMethods = loadTs("lib/payment-methods.ts");

function sampleProduct(overrides = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Barrier Serum",
    slug: "barrier-serum",
    price: 120000,
    stockQuantity: 3,
    ...overrides,
  };
}

function validCustomerForm() {
  const form = new FormData();
  form.set("fullName", "  Rahima Akter  ");
  form.set("phone", "+88 01712-345678");
  form.set("email", "");
  form.set("division", "Dhaka");
  form.set("district", "Dhaka");
  form.set("upazila", "Gulshan");
  form.set("addressLine1", "House 10, Road 5, Gulshan 2");
  form.set("addressLine2", "");
  form.set("postalCode", "1212");
  form.set("notes", "");
  return form;
}

test("cart add, merge, quantity and remove operations clamp to stock", () => {
  const product = sampleProduct();
  let items = cartState.addCartItem([], product, 5);
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 3);

  items = cartState.addCartItem(items, product, 1);
  assert.equal(items[0].quantity, 3, "adding beyond stock must not oversell");

  items = cartState.setCartItemQuantity(items, product.id, 2);
  assert.equal(items[0].quantity, 2);

  items = cartState.setCartItemQuantity(items, product.id, 0);
  assert.equal(items.length, 0, "zero quantity removes the line");

  items = cartState.addCartItem([], product, 1);
  items = cartState.removeCartItem(items, product.id);
  assert.equal(items.length, 0);

  const soldOut = cartState.addCartItem([], sampleProduct({ stockQuantity: 0 }));
  assert.equal(soldOut.length, 0);
});

test("persisted cart JSON is validated and clamped before use", () => {
  const product = sampleProduct();
  const parsed = cartState.parseCart([
    { ...product, quantity: 12 },
    { id: "", name: "Bad", price: 100, quantity: 1 },
    {
      ...sampleProduct({ id: "22222222-2222-4222-8222-222222222222" }),
      price: -5,
      quantity: 1,
    },
  ]);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].quantity, 3);
  assert.equal(cartState.cartCount(parsed), 3);
  assert.equal(cartState.cartSubtotal(parsed), 360000);
  assert.deepEqual(cartState.parseCart("not json"), []);

  // A hand-edited bag with the same product twice must not reach checkout as
  // duplicate lines, and invalid numeric quantities must never become NaN.
  const duplicated = cartState.parseCart([
    { ...product, quantity: 2 },
    { ...product, quantity: 2 },
  ]);
  assert.equal(duplicated.length, 1);
  assert.equal(duplicated[0].quantity, 3);
  assert.equal(cartState.addCartItem([], product, Number.NaN)[0].quantity, 1);
  assert.equal(
    cartState.setCartItemQuantity(duplicated, product.id, Number.NaN).length,
    0,
  );
});

test("poisha totals use authoritative unit prices", () => {
  const totals = checkoutTotals.calculateQuoteTotals(
    [
      { unitPrice: 120000, quantity: 2 },
      { unitPrice: 50000, quantity: 1 },
    ],
    6000,
    10000,
  );

  assert.deepEqual(totals, {
    subtotal: 290000,
    total: 286000,
    totalQuantity: 3,
  });

  assert.throws(() =>
    checkoutTotals.calculateQuoteTotals([{ unitPrice: -1, quantity: 1 }]),
  );
  assert.throws(() =>
    checkoutTotals.calculateQuoteTotals([{ unitPrice: 100, quantity: 1.5 }]),
  );
  assert.deepEqual(
    checkoutTotals.calculateQuoteTotals([], 100, 200),
    { subtotal: 0, total: 0, totalQuantity: 0 },
    "a discount never makes a total negative",
  );
  assert.throws(() =>
    checkoutTotals.calculateQuoteTotals([{ unitPrice: 100, quantity: 1 }], -1),
  );
});

test("checkout customer fields are validated and normalised", () => {
  const customer = checkoutValidation.readCheckoutCustomer(validCustomerForm());
  assert.equal(customer.fullName, "Rahima Akter");
  assert.equal(customer.phone, "01712345678");
  assert.equal(customer.email, null);

  const address = checkoutValidation.toCheckoutAddress(customer);
  assert.equal(address.division, "Dhaka");
  assert.equal(address.upazila, "Gulshan");
  assert.equal(address.area, "Gulshan");
  assert.equal(address.country, "Bangladesh");

  const bad = validCustomerForm();
  bad.set("phone", "12345");
  bad.set("addressLine1", "short");
  assert.throws(
    () => checkoutValidation.readCheckoutCustomer(bad),
    (error) =>
      error instanceof checkoutValidation.CheckoutValidationError &&
      Boolean(error.fieldErrors.phone) &&
      Boolean(error.fieldErrors.addressLine1),
  );
});

test("cart lines and idempotency keys reject tampering", () => {
  const valid = [
    { productId: "11111111-1111-4111-8111-111111111111", quantity: 2 },
  ];
  assert.deepEqual(checkoutValidation.parseCheckoutLines(JSON.stringify(valid)), valid);

  assert.throws(() =>
    checkoutValidation.parseCheckoutLines([
      valid[0],
      { ...valid[0], quantity: 1 },
    ]),
  );
  assert.throws(() =>
    checkoutValidation.parseCheckoutLines([{ ...valid[0], quantity: 100 }]),
  );
  assert.throws(() =>
    checkoutValidation.parseCheckoutLines([
      { ...valid[0], productId: "not-a-uuid" },
    ]),
  );

  assert.doesNotThrow(() =>
    checkoutValidation.readIdempotencyKey("123e4567-e89b-42d3-a456-426614174000"),
  );
  assert.throws(() => checkoutValidation.readIdempotencyKey("short"));
});

test("only cash on delivery is enabled", () => {
  assert.deepEqual(paymentMethods.ENABLED_PAYMENT_METHODS, ["cash_on_delivery"]);
  assert.equal(
    paymentMethods.isEnabledPaymentMethod("cash_on_delivery"),
    true,
  );
  assert.equal(paymentMethods.isEnabledPaymentMethod("bkash"), false);
  assert.equal(paymentMethods.isEnabledPaymentMethod("sslcommerz"), false);
});

test("saved bag count is hidden until hydration so SSR markup matches", () => {
  const header = readFileSync(
    resolve(process.cwd(), "components/layout/header-actions.tsx"),
    "utf8",
  );

  assert.match(header, /useSyncExternalStore\([\s\S]*?readServerMount/);
  assert.match(header, /function readServerMount\(\): boolean \{\s*return false;\s*\}/);
  assert.match(header, /const visibleCartCount = mounted \? cartCount : 0/);
  assert.match(header, /aria-label=\{`Shopping bag, \$\{visibleCartCount\}/);
  assert.doesNotMatch(header, /aria-label=\{`Shopping bag, \$\{cartCount\}/);
});

test("checkout migration keeps order placement atomic and service-role only", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "supabase/migrations/0007_phase6_checkout.sql"),
    "utf8",
  );

  assert.match(migration, /create unique index if not exists orders_idempotency_key_key/);
  assert.match(migration, /for update/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /stock_quantity >= v_quantity/);
  assert.match(migration, /insert into public\.inventory_changes/);
  assert.match(migration, /order_number = p_order_number/);
  assert.match(migration, /confirmation_token = p_confirmation_token/);
  assert.match(
    migration,
    /grant execute on function public\.place_cod_order[\s\S]*?to service_role/,
  );

  const placeGrant = migration.match(
    /grant execute on function public\.place_cod_order[\s\S]*?;/,
  );
  assert.ok(placeGrant);
  assert.doesNotMatch(placeGrant[0], /to anon|to authenticated/);
});
