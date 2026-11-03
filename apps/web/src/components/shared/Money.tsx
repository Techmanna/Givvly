import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/cn";

export type MoneyProps = {
  amountKobo: number;
  className?: string;
};

export function Money({ amountKobo, className }: MoneyProps) {
  return (
    <span className={cn("tabular-nums", className)}>
      {formatNaira(amountKobo)}
    </span>
  );
}

