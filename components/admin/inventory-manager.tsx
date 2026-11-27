"use client";

import { Boxes, PackageCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateStockAction } from "@/app/admin/(panel)/actions";
import { initialMutationState } from "@/app/admin/(panel)/mutation-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export interface InventoryProduct {
  id: string;
  name: string;
  stock: number;
  threshold: number;
  isActive: boolean;
}

export interface InventoryChangeView {
  id: string;
  productName: string;
  previousQuantity: number;
  newQuantity: number;
  delta: number;
  reason: string;
  createdAt: string;
}

export function InventoryManager({
  products,
  changes,
}: {
  products: InventoryProduct[];
  changes: InventoryChangeView[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<InventoryProduct | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("manual_adjustment");
  const [pending, startTransition] = useTransition();

  function open(item: InventoryProduct) {
    setSelected(item);
    setQuantity(String(item.stock));
    setReason("manual_adjustment");
  }

  function save() {
    if (!selected) return;

    const formData = new FormData();
    formData.set("quantity", quantity);
    formData.set("reason", reason);

    startTransition(async () => {
      const result = await updateStockAction(
        selected.id,
        initialMutationState,
        formData,
      );

      if (result.status === "error") {
        toast({ title: "Stock update failed", description: result.message, variant: "promo" });
        return;
      }

      toast({ title: "Stock updated", description: result.message, variant: "success" });
      setSelected(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-warm-line bg-warm-white p-5">
          <span className="flex size-10 items-center justify-center rounded-full bg-soft-cream">
            <TriangleAlert className="size-5 text-dark-text" aria-hidden="true" />
          </span>
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-taupe">
            Out of stock
          </p>
          <p className="mt-1 font-display text-3xl">
            {products.filter((item) => item.stock === 0).length}
          </p>
        </div>
        <div className="rounded-2xl border border-warm-line bg-warm-white p-5">
          <span className="flex size-10 items-center justify-center rounded-full bg-light-beige">
            <Boxes className="size-5 text-dark-text" aria-hidden="true" />
          </span>
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-taupe">
            At or below threshold
          </p>
          <p className="mt-1 font-display text-3xl">
            {
              products.filter(
                (item) => item.stock > 0 && item.stock <= item.threshold,
              ).length
            }
          </p>
        </div>
        <div className="rounded-2xl border border-warm-line bg-warm-white p-5">
          <span className="flex size-10 items-center justify-center rounded-full bg-olive-soft">
            <PackageCheck className="size-5 text-olive-deep" aria-hidden="true" />
          </span>
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-taupe">
            Well stocked
          </p>
          <p className="mt-1 font-display text-3xl">
            {products.filter((item) => item.stock > item.threshold).length}
          </p>
        </div>
      </div>

      <div className="mt-7 overflow-hidden rounded-2xl border border-warm-line bg-warm-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-warm-white text-[10px] uppercase tracking-[0.16em] text-taupe">
              <tr>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Stock</th>
                <th className="px-5 py-3 font-medium">Threshold</th>
                <th className="px-5 py-3 font-medium">Availability</th>
                <th className="px-5 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-line/70">
              {products.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/products/${item.id}/edit`}
                      className="font-medium hover:text-olive-deep"
                    >
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        item.stock === 0
                          ? "font-semibold text-chocolate"
                          : item.stock <= item.threshold
                            ? "font-semibold text-chocolate"
                            : "font-medium"
                      }
                    >
                      {item.stock}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-taupe">{item.threshold}</td>
                  <td className="px-5 py-3 text-taupe">
                    {item.stock === 0 ? "Unavailable" : item.isActive ? "Available" : "Unpublished"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => open(item)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-olive-deep hover:bg-olive-soft"
                    >
                      Update stock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-warm-line bg-warm-white p-6">
        <h2 className="font-display text-xl">Recent stock changes</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-warm-white text-[10px] uppercase tracking-[0.16em] text-taupe">
              <tr>
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium">Change</th>
                <th className="px-4 py-2.5 font-medium">Reason</th>
                <th className="px-4 py-2.5 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-line/70">
              {changes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-taupe">
                    No stock changes recorded yet.
                  </td>
                </tr>
              ) : (
                changes.map((change) => (
                  <tr key={change.id}>
                    <td className="px-4 py-2.5">{change.productName}</td>
                    <td className="px-4 py-2.5">
                      {change.previousQuantity} → {change.newQuantity}{" "}
                      <span
                        className={
                          change.delta > 0 ? "text-olive-deep" : "text-chocolate"
                        }
                      >
                        ({change.delta > 0 ? "+" : ""}
                        {change.delta})
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-taupe">{change.reason}</td>
                    <td className="px-4 py-2.5 text-taupe">
                      {new Date(change.createdAt).toLocaleString("en-BD", {
                        timeZone: "Asia/Dhaka",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Update stock"
        description={selected?.name}
      >
        <div className="space-y-5">
          <div>
            <label htmlFor="quantity" className="mb-2 block text-sm font-medium">
              New quantity
            </label>
            <Input
              id="quantity"
              type="number"
              min="0"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="reason" className="mb-2 block text-sm font-medium">
              Reason
            </label>
            <Input
              id="reason"
              value={reason}
              maxLength={60}
              onChange={(event) => setReason(event.target.value)}
              placeholder="manual_adjustment, restock, damaged…"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save stock"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
