import { MessageCircle } from "lucide-react";
import { connection } from "next/server";

import { whatsappUrl } from "@/lib/whatsapp";
import { getPublicStoreSettings } from "@/services/business-settings";

/**
 * Configurable floating contact button. It only appears when an admin has
 * enabled WhatsApp and supplied a valid Bangladesh mobile number. The message
 * contains no customer or order data.
 */
export async function WhatsAppButton() {
  await connection();
  const settings = await getPublicStoreSettings();
  if (!settings.whatsappEnabled) return null;

  const url = whatsappUrl(
    settings.whatsappNumber,
    `Hello ${settings.storeName}, I have a question.`,
  );
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat with ${settings.storeName} on WhatsApp`}
      className="fixed bottom-5 right-5 z-50 inline-flex size-12 items-center justify-center rounded-full bg-chocolate text-warm-white shadow-secondary transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-deep/40 focus-visible:ring-offset-2"
    >
      <MessageCircle className="size-5" aria-hidden="true" />
    </a>
  );
}
