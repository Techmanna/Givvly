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
  endowedLabel?: string;
  className?: string;
};

export function StepIndicator({
  steps,
  currentStep,
  onSelectStep,
  endowedLabel = "Host workspace ready",
  className,
}: StepIndicatorProps) {
  const totalSteps = Math.max(steps.length, 1);
  // Endowed progress: Step 1 begins at 1/totalSteps (e.g. 20% for 5 steps) so the bar never starts at zero
  const progressPercent = Math.min(
    100,
    Math.max(15, Math.round((currentStep / totalSteps) * 100))
  );
  const currentStepItem =
    steps.find((s) => s.step === currentStep) ?? steps[0];
  const stepsRemaining = Math.max(0, totalSteps - currentStep);

  return (
    <nav aria-label="Progress" className={cn("w-full space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
            <Check className="h-3 w-3" aria-hidden="true" />
            {endowedLabel}
          </span>
          <span className="font-medium text-muted-foreground">
            Step {currentStep} of {totalSteps}
            {currentStepItem ? `: ${currentStepItem.label}` : ""}
          </span>
        </div>
        <span className="font-semibold text-primary">
          {stepsRemaining === 0
            ? `${progressPercent}% • Ready to publish!`
            : stepsRemaining === 1
              ? `${progressPercent}% • Final step next`
              : `${progressPercent}% complete`}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={`Setup progress: ${progressPercent}% complete`}
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ol className="flex items-center justify-between gap-2 pt-1">
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

