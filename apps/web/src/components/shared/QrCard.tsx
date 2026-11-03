"use client";

import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export type QrCardProps = {
  url: string;
  title?: string;
  className?: string;
};

export function QrCard({
  url,
  title = "Event QR code",
  className,
}: QrCardProps) {
  return (
    <Card className={cn("flex flex-col items-center text-center", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <div className="rounded-control border border-border bg-white p-3">
          <QRCodeSVG
            value={url}
            size={156}
            bgColor="#FFFFFF"
            fgColor="#332022"
            level="M"
          />
        </div>
        <p className="max-w-[200px] break-all text-xs text-muted-foreground">
          {url}
        </p>
      </CardContent>
    </Card>
  );
}

