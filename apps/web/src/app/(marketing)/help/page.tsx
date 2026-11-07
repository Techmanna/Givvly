import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { HelpFaqAccordion, type FaqItem } from "./HelpFaqAccordion";

export const metadata: Metadata = {
  title: "Help Center & FAQ — Registries, Cash Payouts & Gifting",
  description:
    "Find clear answers on creating wedding registries, receiving Naira cash payouts at 07:00 WAT, diaspora payments (USD, GBP, EUR), pooled funds, and physical gift delivery.",
  openGraph: {
    title: "Help Center & FAQ — Givvly",
    description:
      "Frequently asked questions about Givvly's registries, cash gifts, diaspora payments, and delivery across Nigeria.",
    images: [
      {
        url: "/images/og-preview.jpg",
        width: 1024,
        height: 614,
        alt: "Givvly Help Center & FAQ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Help Center & FAQ — Givvly",
    description:
      "Find answers on wedding registries, 07:00 WAT cash payouts, and diaspora gifting.",
    images: ["/images/og-preview.jpg"],
  },
};

const FAQS: FaqItem[] = [
  {
    question: "What is Givvly and how does it work?",
    answer:
      "Givvly is Nigeria's premier events-first gifting and registry platform. Hosts create customized celebration websites for weddings, milestone birthdays, baby showers, and send-forths. Guests can view the love story, RSVP, contribute cash gifts in Naira or foreign currencies, fund group items, or purchase curated physical keepsakes that are delivered directly to the celebrant.",
  },
  {
    question: "When and how do cash gifts arrive in my Nigerian bank account?",
    answer:
      "All cash gifts are automatically settled to your verified Nigerian bank account every morning at 07:00 WAT (Africa/Lagos) via Paystack. There is no manual withdrawal fee or delay—your funds land securely and punctually.",
  },
  {
    question: "Can guests abroad in the UK, US, Canada, or Europe send gifts?",
    answer:
      "Yes! Diaspora guests can easily contribute using international debit or credit cards (Visa and Mastercard). On the give screen, guests can preview real-time approximate conversions in USD ($), GBP (£), and EUR (€). Transactions are processed securely by Paystack and settled in Nigerian Naira (NGN) to the celebrant.",
  },
  {
    question: "How do group gift pools and honeymoon funds work?",
    answer:
      "Hosts can create pooled funds for high-ticket items—such as a dream honeymoon, a new home appliance, or a master bedroom makeover. Multiple guests can contribute any amount towards the target. Once the pool is funded, the money settles directly into the celebrant's verified bank account.",
  },
  {
    question: "How does physical gift registry and delivery work in Nigeria?",
    answer:
      "Celebrants can select luxury items, bespoke hampers, and kitchenware from verified Nigerian vendors. When a guest purchases a physical gift, Givvly coordinates with the merchant for premium packaging, custom gift cards, and insured doorstep delivery across major Nigerian cities including Lagos, Abuja, and Port Harcourt.",
  },
  {
    question: "Can guests gift mobile airtime or data bundles on Givvly?",
    answer:
      "Yes! Givvly provides instant VTU airtime and mobile data gifting for all major Nigerian networks—MTN, Airtel, Glo, and 9mobile/T2Mobile. It is an instant, thoughtful gift that delivers value straight to the recipient's phone number.",
  },
  {
    question: "How does Givvly protect my privacy and financial security?",
    answer:
      "Givvly adheres strictly to the Nigeria Data Protection Act (NDPA) and PCI-DSS compliance standards through Paystack. We never store full bank credentials or card numbers. Event hosts can also password-protect their events with private access codes, and guests can choose to give completely anonymously on public feeds.",
  },
  {
    question: "What is the Wall of Love?",
    answer:
      "The Wall of Love is a digital guestbook attached to each celebration. Friends and family can leave heartfelt prayers, memorable stories, and congratulatory photos. After the event, hosts can cherish these messages forever or export them into a commemorative keepsake.",
  },
];

export default function HelpCenterPage() {
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData),
        }}
      />

      <PageHeader
        title="Help & Concierge Support"
        description="Answers to common questions about cash gifts, daily bank payouts, diaspora payments, and gift deliveries."
      />

      <HelpFaqAccordion faqs={FAQS} />
    </div>
  );
}
