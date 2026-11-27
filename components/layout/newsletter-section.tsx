"use client";

import { CircleCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Container } from "@/components/layout/container";
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
 * Newsletter design preview. Submitting validates the field and shows the
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Add your email",
        description: "Enter an email address to join the preview list.",
        variant: "info",
      });
      return;
    }

    setSubmitted(true);
    toast({
      title: "You're on the preview list",
      description: "Newsletter signup goes live with the store.",
      variant: "promo",
    });
  }

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(
        "relative overflow-hidden border-b border-line bg-pink-tint",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-28 size-72 rounded-full bg-pink/15 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 right-0 size-64 rounded-full bg-emerald/10 blur-3xl"
      />

      <Container className="relative grid gap-8 py-14 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-emerald">
            <span
              aria-hidden="true"
              className="inline-block size-1.5 rounded-full bg-pink"
            />
            The Shundori list
          </p>
          <h2
            id={titleId}
            className="mt-3 font-display text-3xl leading-tight text-charcoal sm:text-4xl"
          >
            Beauty notes, first.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-muted">
            New arrivals, quiet rituals and launch news — a considered letter,
            never a crowded inbox.
          </p>
        </div>

        <div>
          {submitted ? (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald/15 bg-white p-5">
              <CircleCheck
                className="mt-0.5 size-5 shrink-0 text-emerald"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-charcoal">
                  Thank you — you&apos;re on the list.
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  We&apos;ll write when the store opens.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                  }}
                  className="mt-3 text-xs font-medium text-emerald underline underline-offset-4 hover:text-charcoal"
                >
                  Use a different email
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor={emailId} className="sr-only">
                  Email address
                </label>
                <input
                  id={emailId}
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Your email address"
                  className="h-12 w-full rounded-full border border-line bg-white px-5 text-sm text-charcoal placeholder:text-muted/70 transition-colors focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/15"
                />
                <Button type="submit" size="lg" className="shrink-0">
                  Subscribe
                </Button>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-muted">
                Preview only — newsletter delivery starts at launch.
              </p>
            </form>
          )}
        </div>
      </Container>
    </section>
  );
}
