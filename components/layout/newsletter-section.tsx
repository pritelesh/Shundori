"use client";

import { CircleCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Container } from "@/components/layout/container";
import { useLocale } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/utils/cn";

export interface NewsletterSectionProps {
  className?: string;
  /** Override the DOM ids when the section appears more than once on a page. */
  id?: string;
  titleId?: string;
  emailId?: string;
}

/**
 * Compact newsletter preview. Submitting validates the field and shows the
 * confirmation state, but nothing is sent or stored in this phase.
 */
export function NewsletterSection({
  className,
  id = "newsletter",
  titleId = "newsletter-title",
  emailId = "newsletter-email",
}: NewsletterSectionProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const { locale } = useLocale();
  const copy =
    locale === "bn"
      ? {
          eyebrow: "শুন্দরী তালিকা",
          title: "সৌন্দর্যের খবর, সরাসরি ইনবক্সে।",
          emailLabel: "ইমেইল ঠিকানা",
          emailPlaceholder: "আপনার ইমেইল ঠিকানা",
          subscribe: "সাবস্ক্রাইব",
          preview: "শুধু প্রিভিউ — উদ্বোধনের সময় নিউজলেটার শুরু হবে।",
          thanksTitle: "ধন্যবাদ — আপনি তালিকায় আছেন।",
          differentEmail: "অন্য ইমেইল ব্যবহার করুন",
          missingTitle: "আপনার ইমেইল যোগ করুন",
          missingBody: "প্রিভিউ তালিকায় যোগ দিতে একটি ইমেইল ঠিকানা দিন।",
          successTitle: "আপনি প্রিভিউ তালিকায় আছেন",
          successBody: "স্টোরের সাথে নিউজলেটারও চালু হবে।",
        }
      : {
          eyebrow: "The Shundori list",
          title: "Beauty updates, straight to your inbox.",
          emailLabel: "Email address",
          emailPlaceholder: "Your email address",
          subscribe: "Subscribe",
          preview: "Preview only — newsletter delivery starts at launch.",
          thanksTitle: "Thank you — you're on the list.",
          differentEmail: "Use a different email",
          missingTitle: "Add your email",
          missingBody: "Enter an email address to join the preview list.",
          successTitle: "You're on the preview list",
          successBody: "Newsletter signup goes live with the store.",
        };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      toast({
        title: copy.missingTitle,
        description: copy.missingBody,
        variant: "info",
      });
      return;
    }

    setSubmitted(true);
    toast({
      title: copy.successTitle,
      description: copy.successBody,
      variant: "promo",
    });
  }

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn("border-b border-cream/15 bg-forest-soft text-cream", className)}
    >
      <Container className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-cream/75">
            {copy.eyebrow}
          </p>
          <h2
            id={titleId}
            className="mt-1 font-display text-xl leading-tight text-cream sm:text-2xl"
          >
            {copy.title}
          </h2>
        </div>

        <div className="w-full sm:w-auto sm:min-w-[22rem]">
          {submitted ? (
            <div className="flex items-center gap-2 rounded-full border border-leaf/20 bg-cream px-4 py-2.5">
              <CircleCheck
                className="size-4 shrink-0 text-leaf"
                aria-hidden="true"
              />
              <p className="min-w-0 flex-1 truncate text-xs font-medium text-ink-soft">
                {copy.thanksTitle}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
                className="shrink-0 text-xs font-medium text-leaf underline underline-offset-4 hover:text-ink-soft"
              >
                {copy.differentEmail}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="flex gap-2">
                <label htmlFor={emailId} className="sr-only">
                  {copy.emailLabel}
                </label>
                <input
                  id={emailId}
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={copy.emailPlaceholder}
                  className="h-11 min-w-0 flex-1 rounded-full border border-sage-light bg-cream px-4 text-sm text-ink-soft placeholder:text-ink-soft transition-colors focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/15"
                />
                <Button type="submit" size="md" className="shrink-0">
                  {copy.subscribe}
                </Button>
              </div>
              <p className="mt-2 text-xs text-cream/70">{copy.preview}</p>
            </form>
          )}
        </div>
      </Container>
    </section>
  );
}
