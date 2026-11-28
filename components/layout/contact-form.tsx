"use client";

import { Send } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

/** Contact UI preview — nothing is sent to a server in this phase. */
export function ContactForm() {
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
    toast({
      title: "Preview message received",
      description: "Nothing was sent — contact delivery is not connected yet.",
      variant: "info",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div>
        <label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-ink-soft">
          Your name
        </label>
        <Input id="contact-name" name="name" autoComplete="name" required placeholder="Your name" />
      </div>
      <div>
        <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-ink-soft">
          Email address
        </label>
        <Input id="contact-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-ink-soft">
          Your message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          placeholder="How can we help?"
          className="w-full rounded-lg border border-sage-light bg-cream px-4 py-3 text-sm text-ink-soft placeholder:text-ink-soft focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/15"
        />
      </div>
      <Button type="submit" size="lg" className="justify-self-start">
        <Send className="size-4" aria-hidden="true" />
        Send message
      </Button>
      {sent ? (
        <p className="text-xs text-ink-soft" role="status">
          Preview submitted locally. No message was stored or delivered.
        </p>
      ) : null}
    </form>
  );
}
