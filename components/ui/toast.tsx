"use client";

import { CircleCheck, Info, Sparkles, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/utils/cn";

export type ToastVariant = "success" | "info" | "promo";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastOptions {
  id: number;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4500;

const variantStyles: Record<
  ToastVariant,
  { border: string; icon: typeof CircleCheck; iconClass: string }
> = {
  success: {
    border: "border-l-leaf",
    icon: CircleCheck,
    iconClass: "text-leaf",
  },
  promo: {
    border: "border-l-forest",
    icon: Sparkles,
    iconClass: "text-forest",
  },
  info: {
    border: "border-l-ink-soft",
    icon: Info,
    iconClass: "text-ink-soft",
  },
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider.");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "info" }: ToastOptions) => {
      const id = ++nextId.current;
      setToasts((current) => [
        ...current.slice(-2),
        { id, title, description, variant },
      ]);

      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end"
      >
        {toasts.map((item) => {
          const style = variantStyles[item.variant];
          const Icon = style.icon;

          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                "pointer-events-auto flex w-full animate-[shundori-toast-in_220ms_ease-out] items-start gap-3 rounded-xl border border-sage-light/80 border-l-4 bg-cream p-4 shadow-soft sm:w-80",
                style.border,
              )}
            >
              <Icon
                className={cn("mt-0.5 size-5 shrink-0", style.iconClass)}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-5 text-ink-soft">
                  {item.title}
                </p>
                {item.description ? (
                  <p className="mt-1 text-xs leading-5 text-ink-soft">
                    {item.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="-mr-1 -mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-mist hover:text-ink-soft"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
