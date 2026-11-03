import Link from "next/link";

interface BrandLogoProps {
    variant?: "header" | "footer";
}

export function BrandLogo({ variant = "header" }: BrandLogoProps) {
    const isHeader = variant === "header";

    return (
        <Link
            href="/"
            aria-label="Givvly home"
            className={
                isHeader
                    ? "group inline-flex items-center gap-3 focus:outline-none"
                    : "inline-flex items-center gap-2.5"
            }
        >
            <span
                className={`flex shrink-0 items-center justify-center rounded-full border border-accent/50 bg-primary/10 font-heading font-semibold text-primary ${isHeader ? "h-10 w-10 text-lg" : "h-8 w-8 text-sm"
                    } ${isHeader ? "transition-transform duration-300 group-hover:scale-105" : ""}`}
            >
                G
            </span>

            <div className={isHeader ? "flex flex-col" : ""}>
                <span
                    className={`font-heading font-semibold text-foreground ${isHeader
                            ? "text-2xl tracking-tight"
                            : "text-xl"
                        }`}
                >
                    Givvly
                </span>

                {isHeader && (
                    <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                        The Right Gift, For the Right Moment
                    </span>
                )}
            </div>
        </Link>
    );
}