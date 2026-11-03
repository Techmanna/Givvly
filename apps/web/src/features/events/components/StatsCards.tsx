import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/shared/Money";
import { Gift, HeartHandshake, Star, Users } from "lucide-react";

export type StatsCardsProps = {
  totalReceivedKobo?: number;
  giftCount?: number;
  rsvpYesCount?: number;
  activeEventsCount?: number;
};

export function StatsCards({
  totalReceivedKobo = 0,
  giftCount = 0,
  rsvpYesCount = 0,
  activeEventsCount,
}: StatsCardsProps) {
  const cards = [
    {
      title: "Total gifts received",
      value: <Money amountKobo={totalReceivedKobo ?? 0} />,
      subtitle: "Secured directly in Nigerian Naira",
      icon: HeartHandshake,
      iconBg: "bg-primary/10 text-primary",
      borderColor: "border-primary/20",
    },
    {
      title: "Gift items & combos",
      value: (giftCount ?? 0).toLocaleString(),
      subtitle: "Wrapped physical & digital gifts",
      icon: Gift,
      iconBg: "bg-accent/15 text-accent-foreground",
      borderColor: "border-accent/20",
    },
    {
      title: "Confirmed RSVPs",
      value: (rsvpYesCount ?? 0).toLocaleString(),
      subtitle: "Guests attending your celebrations",
      icon: Users,
      iconBg: "bg-emerald-500/10 text-emerald-600",
      borderColor: "border-emerald-500/20",
    },
    ...(typeof activeEventsCount === "number"
      ? [
          {
            title: "Active celebrations",
            value: (activeEventsCount ?? 0).toLocaleString(),
            subtitle: "Events currently live or upcoming",
            icon: Star,
            iconBg: "bg-amber-500/10 text-amber-600",
            borderColor: "border-amber-500/20",
          },
        ]
      : []),
  ];

  return (
    <div
      className={`grid grid-cols-1 gap-4 ${
        cards.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"
      }`}
    >
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <Card
            key={i}
            className={`relative overflow-hidden border ${card.borderColor} bg-card/80 backdrop-blur-sm shadow-soft transition-all duration-300 hover:shadow-card hover:-translate-y-0.5`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {card.title}
                </span>
                <span className={`inline-flex rounded-xl p-2 ${card.iconBg}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground">
                {card.value}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {card.subtitle}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
