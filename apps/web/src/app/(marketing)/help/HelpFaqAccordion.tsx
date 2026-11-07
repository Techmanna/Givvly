"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface FaqItem {
  question: string;
  answer: string;
}

interface HelpFaqAccordionProps {
  faqs: FaqItem[];
}

export function HelpFaqAccordion({ faqs }: HelpFaqAccordionProps) {
  const [openItems, setOpenItems] = useState<number[]>([0]);

  const toggleItem = (index: number) => {
    setOpenItems((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index]
    );
  };

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => {
        const isOpen = openItems.includes(index);
        const answerId = `faq-answer-${index}`;

        return (
          <Card
            key={faq.question}
            className={`overflow-hidden rounded-xl border border-border/60 shadow-none transition-all duration-300 ${
              isOpen ? "border-primary/40 bg-card/60" : "hover:border-border"
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
                <CardTitle className="font-display text-base font-semibold leading-relaxed text-foreground sm:text-lg">
                  {faq.question}
                </CardTitle>

                <ChevronDown
                  aria-hidden="true"
                  className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-primary" : ""
                  }`}
                />
              </button>
            </CardHeader>

            {isOpen && (
              <CardContent
                id={answerId}
                className="px-5 pb-5 pt-0 text-sm leading-7 text-muted-foreground"
              >
                {faq.answer}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

