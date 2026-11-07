import { PayoutSetupForm } from "@/features/events";
import { WalletDashboardCard } from "@/features/wallet";

export default function PayoutSetupPage() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Digital Wallet &amp; Payouts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your Givvly double-entry wallet balance, CBN KYC tier limits,
          4-digit transaction PIN, and verified Nigerian bank payout account.
        </p>
      </div>

      <WalletDashboardCard />

      <div className="pt-2">
        <h2 className="mb-3 font-heading text-lg font-bold text-foreground">
          Verified Nigerian Bank Account (CBN Tier 2 Upgrade &amp; Closed-Loop Withdrawals)
        </h2>
        <PayoutSetupForm />
      </div>
    </main>
  );
}

