"use client";

import { Toaster as Sonner, toast } from "sonner";
import type { ComponentProps } from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";

type ToasterProps = ComponentProps<typeof Sonner>;

const BRAND_TOAST_ICONS = {
  success: (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2E7D5B]/15 text-[#2E7D5B] dark:bg-[#45A179]/20 dark:text-[#68C49A]"
      aria-hidden="true"
    >
      <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
    </span>
  ),
  error: (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#B5495B]/15 text-[#B5495B] dark:bg-[#D9788A]/20 dark:text-[#D9788A]"
      aria-hidden="true"
    >
      <AlertCircle className="h-3.5 w-3.5 stroke-[2.5]" />
    </span>
  ),
  warning: (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4A959]/25 text-[#B7791F] dark:bg-[#E2BD77]/20 dark:text-[#E2BD77]"
      aria-hidden="true"
    >
      <AlertTriangle className="h-3.5 w-3.5 stroke-[2.5]" />
    </span>
  ),
  info: (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#B5495B]/15 text-[#B5495B] dark:bg-[#D9788A]/20 dark:text-[#D9788A]"
      aria-hidden="true"
    >
      <Sparkles className="h-3.5 w-3.5 stroke-[2.5]" />
    </span>
  ),
  loading: (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#B5495B]/10 text-[#B5495B] dark:bg-[#D9788A]/20 dark:text-[#D9788A]"
      aria-hidden="true"
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
    </span>
  ),
  close: <X className="h-3.5 w-3.5" />,
};

function Toaster({
  position = "top-center",
  closeButton = true,
  richColors = true,
  duration = 4000,
  gap = 10,
  toastOptions,
  ...props
}: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      position={position}
      closeButton={closeButton}
      richColors={richColors}
      duration={duration}
      gap={gap}
      icons={BRAND_TOAST_ICONS}
      toastOptions={{
        ...toastOptions,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg rounded-[18px] p-3.5 sm:p-4 font-sans backdrop-blur-md transition-all duration-200",
          title:
            "font-heading font-semibold text-sm tracking-tight text-foreground",
          description: "text-xs text-muted-foreground leading-relaxed mt-0.5",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:hover:bg-primary/90 group-[.toast]:text-primary-foreground font-semibold text-xs rounded-full px-3.5 py-1.5 shadow-xs transition-all",
          cancelButton:
            "group-[.toast]:bg-muted/80 group-[.toast]:hover:bg-muted group-[.toast]:text-muted-foreground font-medium text-xs rounded-full px-3 py-1.5 transition-all",
          closeButton:
            "border border-border/80 bg-card/90 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-all",
          success:
            "group-[.toaster]:!bg-[#F0F7F3] dark:group-[.toaster]:!bg-[#16271E] group-[.toaster]:!border-[#C6E2D2] dark:group-[.toaster]:!border-[#224A35] group-[.toaster]:!text-[#1F5C40] dark:group-[.toaster]:!text-[#7FD3A8]",
          error:
            "group-[.toaster]:!bg-[#FDF2F4] dark:group-[.toaster]:!bg-[#2C151A] group-[.toaster]:!border-[#F2CBD2] dark:group-[.toaster]:!border-[#57212D] group-[.toaster]:!text-[#962E3E] dark:group-[.toaster]:!text-[#F391A1]",
          warning:
            "group-[.toaster]:!bg-[#FDF8EC] dark:group-[.toaster]:!bg-[#2A1F0D] group-[.toaster]:!border-[#F2DFB8] dark:group-[.toaster]:!border-[#523A15] group-[.toaster]:!text-[#875510] dark:group-[.toaster]:!text-[#F2BE58]",
          info:
            "group-[.toaster]:!bg-[#FAF3EF] dark:group-[.toaster]:!bg-[#28181C] group-[.toaster]:!border-[#EAD7CD] dark:group-[.toaster]:!border-[#4B2832] group-[.toaster]:!text-[#963847] dark:group-[.toaster]:!text-[#E08595]",
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  );
}

export { Toaster, toast };
