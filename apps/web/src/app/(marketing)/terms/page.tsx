import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Rules, policies, and terms governing celebrations, cash gifts, and physical gift orders on Givvly.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Terms of Service"
        description="Rules and terms governing celebrations, cash gifts, and physical gift orders on Givvly."
      />
      <Card>
        <CardContent className="space-y-4 p-6 text-sm leading-relaxed text-ink">
          <p>
            By creating an event or sending a gift on Givvly, you agree to
            provide accurate information and use the platform solely for
            legitimate celebrations and personal gifting.
          </p>
          <p>
            All monetary values are processed in Nigerian Naira (NGN) and
            settled to verified Nigerian bank accounts during daily 07:00 WAT
            settlement windows.
          </p>
          <p>
            Physical gift orders are fulfilled by verified vendors and covered
            by the Givvly Buyer Protection & Dispute Resolution Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
