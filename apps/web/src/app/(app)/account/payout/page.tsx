import { PayoutSetupForm } from "@/features/events";

export default function PayoutSetupPage() {
  return (
    <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Payout account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your Nigerian bank account to receive cash gifts from your
          events.
        </p>
      </div>
      <PayoutSetupForm />
    </main>
  );
}

