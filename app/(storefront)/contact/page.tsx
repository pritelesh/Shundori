import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";

import { ContactForm } from "@/components/layout/contact-form";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { contactPlaceholders } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Shundori. Contact channels are placeholders until launch.",
};

const pending = "To be confirmed before launch";

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="We would love to hear from you."
        description="Questions about products, orders or the storefront? Use the preview form below. Contact channels are intentionally left as editable placeholders."
      />

      <Container className="py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <section aria-labelledby="contact-details-title">
            <h2 id="contact-details-title" className="font-display text-2xl text-dark-text">
              Contact details
            </h2>
            <p className="mt-2 text-sm leading-7 text-taupe">
              Replace the empty values in <code className="rounded bg-warm-white px-1.5 py-0.5">lib/site.ts</code> with
              approved business details. No address, phone number or email has been invented.
            </p>

            <dl className="mt-8 space-y-5">
              <div className="flex gap-4">
                <Mail className="mt-0.5 size-5 shrink-0 text-olive-deep" aria-hidden="true" />
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-taupe">Email</dt>
                  <dd className="mt-1 text-sm text-dark-text">{contactPlaceholders.email || pending}</dd>
                </div>
              </div>
              <div className="flex gap-4">
                <Phone className="mt-0.5 size-5 shrink-0 text-olive-deep" aria-hidden="true" />
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-taupe">Phone</dt>
                  <dd className="mt-1 text-sm text-dark-text">{contactPlaceholders.phone || pending}</dd>
                </div>
              </div>
              <div className="flex gap-4">
                <MapPin className="mt-0.5 size-5 shrink-0 text-olive-deep" aria-hidden="true" />
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-taupe">Address</dt>
                  <dd className="mt-1 text-sm text-dark-text">
                    {[contactPlaceholders.addressLine1, contactPlaceholders.addressLine2, contactPlaceholders.city, contactPlaceholders.country]
                      .filter(Boolean)
                      .join(", ") || pending}
                  </dd>
                </div>
              </div>
              <div className="flex gap-4">
                <MessageCircle className="mt-0.5 size-5 shrink-0 text-olive-deep" aria-hidden="true" />
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-taupe">Support hours</dt>
                  <dd className="mt-1 text-sm text-dark-text">{contactPlaceholders.businessHours || pending}</dd>
                </div>
              </div>
            </dl>
          </section>

          <section aria-labelledby="contact-form-title" className="rounded-2xl border border-warm-line bg-warm-white p-6 sm:p-8">
            <h2 id="contact-form-title" className="font-display text-2xl text-dark-text">
              Send a message
            </h2>
            <p className="mt-2 text-sm text-taupe">This form is a UI preview only.</p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </section>
        </div>
      </Container>
    </>
  );
}
