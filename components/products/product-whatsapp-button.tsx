import { MessageCircle } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";

/**
 * Direct product enquiry over WhatsApp. The URL is prepared by the server
 * from public store settings; it never contains customer or order data.
 */
export function ProductWhatsappButton({ href }: { href: string | null }) {
  if (!href) return null;

  return (
    <a
      href={href}
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
