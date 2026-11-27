import { MessageCircle } from "lucide-react";
import { connection } from "next/server";

import { buttonStyles } from "@/components/ui/button";
import { productEnquiryMessage, whatsappUrl } from "@/lib/whatsapp";
import { getPublicStoreSettings } from "@/services/business-settings";

/**
 * Direct product enquiry over WhatsApp. Only the public product name is put in
 * the message; no customer or order data is included.
 */
export async function ProductWhatsappButton({
  productName,
}: {
  productName: string;
}) {
  await connection();
  const settings = await getPublicStoreSettings();
  if (!settings.whatsappEnabled) return null;

  const url = whatsappUrl(
    settings.whatsappNumber,
    productEnquiryMessage(productName, settings.storeName),
  );
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonStyles({
        variant: "secondary",
        className: "w-full",
      })}
    >
      <MessageCircle className="size-4" aria-hidden="true" />
      Ask on WhatsApp
    </a>
  );
}
