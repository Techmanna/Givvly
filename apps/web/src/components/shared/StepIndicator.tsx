import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export type StepItem = {
  step: number;
  label: string;
};

export type StepIndicatorProps = {
  steps: readonly StepItem[];
  currentStep: number;
  onSelectStep?: (step: number) => void;
  className?: string;
};

export function StepIndicator({
  steps,
  currentStep,
  onSelectStep,
  className,
}: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol className="flex items-center justify-between gap-2">
        {steps.map((item) => {
          const isCompleted = item.step < currentStep;
          const isCurrent = item.step === currentStep;
          const canNavigate = isCompleted && !!onSelectStep;

          return (
            <li key={item.step} className="flex flex-1 flex-col items-center">
              <button
                type="button"
                disabled={!canNavigate}
                onClick={() => canNavigate && onSelectStep(item.step)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  isCompleted &&
                    "border-primary bg-primary text-primary-foreground",
                  isCurrent &&
                    "border-primary bg-card text-primary ring-2 ring-primary/30",
                  !isCompleted &&
                    !isCurrent &&
                    "border-border bg-muted text-muted-foreground",
                  canNavigate && "cursor-pointer hover:opacity-90"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  item.step
                )}
              </button>
              <span
                className={cn(
                  "mt-1.5 text-center text-xs font-medium",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

