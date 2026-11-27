"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import {
  createCouponAction,
  deleteCouponAction,
  updateCouponAction,
} from "@/app/admin/(panel)/actions";
import { initialMutationState } from "@/app/admin/(panel)/mutation-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { Coupon, CouponDiscountType } from "@/types/phase8";

const fieldClass =
  "h-11 w-full rounded-lg border border-warm-line bg-warm-white px-4 text-sm text-dark-text focus:border-olive-deep focus:outline-none focus:ring-2 focus:ring-olive-deep/15";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-chocolate">{message}</p>;
}

function dateTimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + 6 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}

function valueLabel(coupon: Coupon): string {
  return coupon.discountType === "percentage"
    ? `${coupon.discountValue / 100}% off`
    : `${(coupon.discountValue / 100).toFixed(2)} BDT off`;
}

function CouponFields({
  coupon,
  fieldErrors,
}: {
  coupon?: Coupon;
  fieldErrors: Record<string, string>;
}) {
  const [type, setType] = useState<CouponDiscountType>(
    coupon?.discountType ?? "percentage",
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="code" className="mb-2 block text-sm font-medium">
          Coupon code *
        </label>
        <Input
          id="code"
          name="code"
          required
          maxLength={30}
          defaultValue={coupon?.code ?? ""}
          placeholder="Shundori15"
          className="uppercase"
        />
        <FieldError message={fieldErrors.code} />
      </div>

      <div>
        <label htmlFor="discountType" className="mb-2 block text-sm font-medium">
          Discount type
        </label>
        <select
          id="discountType"
          name="discountType"
          value={type}
          onChange={(event) =>
            setType(event.target.value as CouponDiscountType)
          }
          className={fieldClass}
        >
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed amount</option>
        </select>
      </div>

      {type === "percentage" ? (
        <div>
          <label htmlFor="percentage" className="mb-2 block text-sm font-medium">
            Percentage off *
          </label>
          <Input
            id="percentage"
            name="percentage"
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            defaultValue={
              coupon?.discountType === "percentage"
                ? coupon.discountValue / 100
                : ""
            }
            placeholder="15"
          />
          <FieldError message={fieldErrors.percentage} />
        </div>
      ) : (
        <div>
          <label
            htmlFor="fixedAmountTaka"
            className="mb-2 block text-sm font-medium"
          >
            Fixed amount off (BDT) *
          </label>
          <Input
            id="fixedAmountTaka"
            name="fixedAmountTaka"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={
              coupon?.discountType === "fixed"
                ? coupon.discountValue / 100
                : ""
            }
            placeholder="100.00"
          />
          <FieldError message={fieldErrors.fixedAmountTaka} />
        </div>
      )}

      <div>
        <label
          htmlFor="minimumOrderTaka"
          className="mb-2 block text-sm font-medium"
        >
          Minimum order (BDT)
        </label>
        <Input
          id="minimumOrderTaka"
          name="minimumOrderTaka"
          type="number"
          min="0"
          step="0.01"
          defaultValue={coupon ? coupon.minimumSubtotal / 100 : 0}
        />
        <FieldError message={fieldErrors.minimumOrderTaka} />
      </div>

      <div>
        <label
          htmlFor="maximumDiscountTaka"
          className="mb-2 block text-sm font-medium"
        >
          Maximum discount (BDT)
        </label>
        <Input
          id="maximumDiscountTaka"
          name="maximumDiscountTaka"
          type="number"
          min="0"
          step="0.01"
          defaultValue={
            coupon?.maximumDiscount !== null && coupon?.maximumDiscount !== undefined
              ? coupon.maximumDiscount / 100
              : ""
          }
          placeholder="No cap"
        />
        <FieldError message={fieldErrors.maximumDiscountTaka} />
      </div>

      <div>
        <label htmlFor="startsAt" className="mb-2 block text-sm font-medium">
          Starts at
        </label>
        <Input
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          defaultValue={dateTimeLocal(coupon?.startsAt)}
        />
        <FieldError message={fieldErrors.startsAt} />
      </div>

      <div>
        <label htmlFor="endsAt" className="mb-2 block text-sm font-medium">
          Expiry date
        </label>
        <Input
          id="endsAt"
          name="endsAt"
          type="datetime-local"
          defaultValue={dateTimeLocal(coupon?.endsAt)}
        />
        <FieldError message={fieldErrors.endsAt} />
      </div>

      <div>
        <label htmlFor="usageLimit" className="mb-2 block text-sm font-medium">
          Usage limit
        </label>
        <Input
          id="usageLimit"
          name="usageLimit"
          type="number"
          min="1"
          step="1"
          defaultValue={coupon?.usageLimit ?? ""}
          placeholder="Unlimited"
        />
        <FieldError message={fieldErrors.usageLimit} />
      </div>

      <label className="flex items-center gap-3 self-end pb-3 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={coupon?.isActive ?? true}
          className="size-4 accent-olive-deep"
        />
        Active
      </label>
    </div>
  );
}

export function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createCouponAction(initialMutationState, formData);
      if (result.status === "error") {
        setCreateErrors(result.fieldErrors);
        toast({ title: "Could not create coupon", description: result.message, variant: "promo" });
        return;
      }
      setCreateErrors({});
      setCreateOpen(false);
      toast({ title: result.message, variant: "success" });
      router.refresh();
    });
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const formData = new FormData(event.currentTarget);
    const id = editing.id;
    startTransition(async () => {
      const result = await updateCouponAction(id, initialMutationState, formData);
      if (result.status === "error") {
        setEditErrors(result.fieldErrors);
        toast({ title: "Could not save coupon", description: result.message, variant: "promo" });
        return;
      }
      setEditErrors({});
      setEditing(null);
      toast({ title: result.message, variant: "success" });
      router.refresh();
    });
  }

  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteCouponAction(deleting.id);
      if (result.status === "error") {
        toast({ title: "Delete failed", description: result.message, variant: "promo" });
        return;
      }
      setDeleting(null);
      toast({ title: result.message, variant: "success" });
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          New coupon
        </Button>
      </div>

      {coupons.length === 0 ? (
        <p className="rounded-xl border border-warm-line bg-peach/40 p-6 text-sm text-taupe">
          No coupons yet. Create one to offer a discount at checkout.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-warm-line bg-warm-white">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="bg-peach/50 text-xs uppercase tracking-wide text-taupe">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Minimum</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-line">
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td className="px-4 py-3 font-medium">{coupon.code}</td>
                  <td className="px-4 py-3">{valueLabel(coupon)}</td>
                  <td className="px-4 py-3">
                    {(coupon.minimumSubtotal / 100).toFixed(2)} BDT
                  </td>
                  <td className="px-4 py-3">
                    {coupon.redemptionsCount}
                    {coupon.usageLimit !== null ? ` / ${coupon.usageLimit}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        coupon.isActive ? "text-olive-deep" : "text-taupe"
                      }
                    >
                      {coupon.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditErrors({});
                          setEditing(coupon);
                        }}
                        aria-label={`Edit ${coupon.code}`}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleting(coupon)}
                        aria-label={`Delete ${coupon.code}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create coupon"
        description="Coupon rules are checked again when the order is placed."
      >
        <form onSubmit={submitCreate} className="space-y-5">
          <CouponFields fieldErrors={createErrors} />
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Creating…" : "Create coupon"}
          </Button>
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.code ?? "coupon"}`}
      >
        {editing ? (
          <form onSubmit={submitEdit} className="space-y-5">
            <CouponFields key={editing.id} coupon={editing} fieldErrors={editErrors} />
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Saving…" : "Save coupon"}
            </Button>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete coupon"
        description={`Delete ${deleting?.code ?? "this coupon"}? Existing orders keep their recorded discount.`}
      >
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button type="button" onClick={remove} disabled={pending}>
            {pending ? "Deleting…" : "Delete coupon"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
