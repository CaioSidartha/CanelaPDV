"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { STOCK_USAGE_LABEL, STOCK_USAGES } from "@/lib/stock-usage";
import type { StockUsage } from "@/types";

export function UsageSelect({
  value,
  onChange,
  ariaLabel,
  compact = false,
}: {
  value: StockUsage;
  onChange: (usage: StockUsage) => void;
  ariaLabel: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={root} className="relative inline-block text-left">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={
          compact
            ? "inline-flex items-center gap-1 rounded-md border border-primary/55 bg-transparent px-2 py-0.5 text-[11px] font-semibold text-primary"
            : "inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-zinc-950 px-3 py-1 text-xs font-semibold text-primary"
        }
      >
        {STOCK_USAGE_LABEL[value]}
        <ChevronDown className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      </button>
      {open && (
        <ul className="absolute left-0 z-30 mt-1 min-w-[11rem] overflow-hidden rounded-md border border-white/10 bg-zinc-950 py-1 shadow-xl">
          {STOCK_USAGES.map((usage) => (
            <li key={usage}>
              <button
                type="button"
                className={`block w-full px-3 py-2 text-left text-sm font-medium text-primary hover:bg-primary/15 ${
                  usage === value ? "bg-primary/10" : ""
                }`}
                onClick={() => {
                  onChange(usage);
                  setOpen(false);
                }}
              >
                {STOCK_USAGE_LABEL[usage]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
