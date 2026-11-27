"use client";

import Image from "next/image";
import { Save, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";

import {
  updateStoreSettingsAction,
  uploadStoreLogoAction,
} from "@/app/admin/(panel)/actions";
import { initialMutationState } from "@/app/admin/(panel)/mutation-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { StoreSettings } from "@/types/phase8";

const textareaClass =
  "w-full rounded-lg border border-line bg-white px-4 py-3 text-sm text-charcoal placeholder:text-muted/70 transition-colors focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/15";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-pink">{message}</p>;
}

function useMutationToast(action: typeof updateStoreSettingsAction) {
  const router = useRouter();
  const { toast } = useToast();
  const handled = useRef("");
  const [state, formAction, pending] = useActionState(
    action,
    initialMutationState,
  );

  useEffect(() => {
    if (state.status === "idle" || !state.message) return;
    const marker = `${state.status}:${state.message}`;
    if (handled.current === marker) return;
    handled.current = marker;

    toast({
      title: state.status === "success" ? "Saved" : "Could not save",
      description: state.message,
      variant: state.status === "success" ? "success" : "promo",
    });
    if (state.status === "success") router.refresh();
  }, [state, router, toast]);

  return { state, formAction, pending };
}

export function StoreSettingsForm({
  settings,
  logoUrl,
}: {
  settings: StoreSettings;
  logoUrl: string | null;
}) {
  const details = useMutationToast(updateStoreSettingsAction);
  const logo = useMutationToast(uploadStoreLogoAction);

  return (
    <div className="space-y-8">
      <form action={details.formAction} className="space-y-6">
        <input type="hidden" name="storeLogoPath" value={settings.storeLogoPath ?? ""} />

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="storeName" className="mb-2 block text-sm font-medium">
              Store name *
            </label>
            <Input
              id="storeName"
              name="storeName"
              required
              maxLength={80}
              defaultValue={settings.storeName}
              aria-invalid={Boolean(details.state.fieldErrors.storeName)}
            />
            <FieldError message={details.state.fieldErrors.storeName} />
          </div>

          <div>
            <label htmlFor="currency" className="mb-2 block text-sm font-medium">
              Currency
            </label>
            <Input
              id="currency"
              name="currency"
              maxLength={10}
              defaultValue={settings.currency}
              aria-invalid={Boolean(details.state.fieldErrors.currency)}
            />
            <FieldError message={details.state.fieldErrors.currency} />
          </div>

          <div>
            <label htmlFor="contactNumber" className="mb-2 block text-sm font-medium">
              Contact number
            </label>
            <Input
              id="contactNumber"
              name="contactNumber"
              type="tel"
              maxLength={40}
              defaultValue={settings.contactNumber}
              placeholder="+8801XXXXXXXXX"
              aria-invalid={Boolean(details.state.fieldErrors.contactNumber)}
            />
            <FieldError message={details.state.fieldErrors.contactNumber} />
          </div>

          <div>
            <label htmlFor="whatsappNumber" className="mb-2 block text-sm font-medium">
              WhatsApp number
            </label>
            <Input
              id="whatsappNumber"
              name="whatsappNumber"
              type="tel"
              maxLength={40}
              defaultValue={settings.whatsappNumber}
              placeholder="01XXXXXXXXX"
              aria-invalid={Boolean(details.state.fieldErrors.whatsappNumber)}
            />
            <FieldError message={details.state.fieldErrors.whatsappNumber} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="contactEmail" className="mb-2 block text-sm font-medium">
              Email
            </label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              maxLength={160}
              defaultValue={settings.contactEmail}
              placeholder="hello@example.com"
              aria-invalid={Boolean(details.state.fieldErrors.contactEmail)}
            />
            <FieldError message={details.state.fieldErrors.contactEmail} />
          </div>

          <label className="flex items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              name="whatsappEnabled"
              defaultChecked={settings.whatsappEnabled}
              className="size-4 rounded border-line accent-emerald"
            />
            <span className="text-sm text-charcoal">
              Show the WhatsApp contact button on the storefront
            </span>
          </label>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Social media links
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(["facebook", "instagram", "youtube", "tiktok"] as const).map(
              (key) => (
                <div key={key}>
                  <label
                    htmlFor={key}
                    className="mb-2 block text-sm font-medium capitalize"
                  >
                    {key}
                  </label>
                  <Input
                    id={key}
                    name={key}
                    type="url"
                    maxLength={500}
                    defaultValue={settings.socialLinks[key] ?? ""}
                    placeholder="https://"
                    aria-invalid={Boolean(details.state.fieldErrors.socialLinks)}
                  />
                </div>
              ),
            )}
          </div>
          <FieldError message={details.state.fieldErrors.socialLinks} />
        </div>

        <div>
          <label htmlFor="storeDescription" className="mb-2 block text-sm font-medium">
            Store description
          </label>
          <textarea
            id="storeDescription"
            name="storeDescription"
            rows={4}
            maxLength={1000}
            defaultValue={settings.storeDescription}
            className={textareaClass}
            aria-invalid={Boolean(details.state.fieldErrors.storeDescription)}
          />
          <FieldError message={details.state.fieldErrors.storeDescription} />
        </div>

        <Button type="submit" disabled={details.pending}>
          <Save className="size-4" aria-hidden="true" />
          {details.pending ? "Saving…" : "Save store details"}
        </Button>
      </form>

      <div className="border-t border-line pt-6">
        <h3 className="font-display text-lg text-charcoal">Store logo</h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          JPG, PNG or WebP up to 5 MB. The logo replaces the text wordmark in the
          header and footer.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-5">
          <div className="flex h-20 w-40 items-center justify-center overflow-hidden rounded-xl border border-line bg-cream-soft">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Current store logo"
                width={160}
                height={80}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="font-display text-lg tracking-[0.2em] text-charcoal">
                Shundori
              </span>
            )}
          </div>

          <form action={logo.formAction} className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="logo" className="mb-2 block text-sm font-medium">
                Upload a new logo
              </label>
              <Input
                id="logo"
                name="logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                aria-invalid={Boolean(logo.state.fieldErrors.logo)}
              />
              <FieldError message={logo.state.fieldErrors.logo} />
            </div>
            <Button type="submit" variant="secondary" disabled={logo.pending}>
              <Upload className="size-4" aria-hidden="true" />
              {logo.pending ? "Uploading…" : "Upload logo"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
