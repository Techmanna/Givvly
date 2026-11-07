import Link from "next/link";
import { cn } from "@/lib/cn";
import Image from "next/image";

export interface BrandLogoProps {
    variant?: "header" | "footer";
    href?: string;
    showTagline?: boolean;
    className?: string;
}

export function BrandLogo({
    variant = "header",
    href = "/",
    className,
}: BrandLogoProps) {
    const isHeader = variant === "header";

    return (
        <Link
            href={href}
            aria-label="Givvly home"
            className={cn(
                "group inline-flex items-center focus:outline-hidden",
                isHeader ? "gap-2.5 sm:gap-3" : "gap-2.5",
                className
            )}
        >
            <Image src="/images/givvly-logo.png" alt="Givvly Logo" width={70} height={50} />
        </Link>
    );
}