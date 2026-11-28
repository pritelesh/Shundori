import { Info } from "lucide-react";

import { cn } from "@/utils/cn";

/**
 * Honest disclosure used everywhere demonstration catalogue data appears.
 * Real supplier photography and verified specifications will replace it.
 */
export function DemoNotice({
  className,
  demo = true,
}: {
  className?: string;
  demo?: boolean;
}) {
  if (!demo) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 surface-card rounded-xl px-4 py-3 text-xs leading-5 text-ink-soft",
        className,
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden="true" />
      <p>
        <span className="font-semibold text-ink-soft">Demonstration catalogue.</span>{" "}
        Product names, details and placeholder artwork are illustrative and not
        verified supplier information. Brand names are shown as text only — no
        official logos are reproduced.
      </p>
    </div>
  );
}
