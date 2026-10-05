import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 outline-none shadow-inner shadow-black/10 backdrop-blur-sm placeholder:text-zinc-500 focus:border-brand/50 focus:ring-2 focus:ring-orange-500/20",
        className
      )}
      {...props}
    />
  );
});
