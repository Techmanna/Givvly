
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const faqs = [
  {
    question: "When do cash gifts arrive in my bank account?",
    answer:
      "Verified payout accounts receive automatic Paystack settlements every morning at 07:00 WAT (Africa/Lagos). Ensure your payout account is verified and eligible for settlement.",
  },
  {
    question: "Can diaspora guests give from the UK, US, or Europe?",
    answer:
      "Yes! Guests can preview approximate USD, GBP, or EUR equivalents on the give screen while Paystack processes supported international cards and settles in NGN.",
  },
];

export default function HelpCenterPage() {
  const [openItems, setOpenItems] = useState<number[]>([0]);

  const toggleItem = (index: number) => {
    setOpenItems((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index],
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Help & Concierge Support"
        description="Answers to common questions about cash gifts, payouts, and gift deliveries."
      />

      <div className="space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openItems.includes(index);
          const answerId = `faq-answer-${index}`;

          return (
            <Card
              key={faq.question}
              className={`overflow-hidden rounded-xl  shadow-none transition-all duration300 ${isOpen ? "border-primary/30" : ""
                }`}
            >
              <CardHeader className="p-0">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  onClick={() => toggleItem(index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                >
                  <CardTitle className="font-display text-base leading-relaxed sm:text-lg">
                    {faq.question}
                  </CardTitle>

                  <ChevronDown
                    aria-hidden="true"
                    className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                      }`}
                  />
                </button>
              </CardHeader>

              {isOpen && (
                <CardContent
                  id={answerId}
                  className="px-5 pb-5 pt-0 text-sm leading-7 text-ink-muted"
                >
                  {faq.answer}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
