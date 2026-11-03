import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Privacy Policy"
        description="How Givvly protects your personal data under the Nigeria Data Protection Act (NDPA)."
      />
      <Card>
        <CardContent className="space-y-4 p-6 text-sm leading-relaxed text-ink">
          <p>
            Givvly collects only the information necessary to host your
            celebration pages, process Naira gifts through Paystack, and
            deliver physical gifts to recipients in Nigeria.
          </p>
          <p>
            We never store card numbers or full bank credentials in your
            browser. Payout bank account numbers are verified server-side and
            masked to the last 4 digits across all responses.
          </p>
          <p>
            Guests who choose to give anonymously have their display name hidden
            from public feeds and the Wall of Love.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

