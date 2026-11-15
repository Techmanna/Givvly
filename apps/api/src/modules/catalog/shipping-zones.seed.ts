import type { PrismaService } from "../../infra/prisma/prisma.service";

export const DEFAULT_SHIPPING_ZONES_SEED = [
  {
    code: "ZONE_A",
    name: "ZONE A",
    areas: "Gbagada, Yaba, Iwaya, Shomolu, Bariga, Sabo, Onipanu, Palmgroove, Ilupeju",
    deliveryNote: "YOU’D BE REQUIRED TO RECEIVE AT ESTATE GATE IF BIKES AREN’T ALLOWED",
    etaLabel: "Within 48hrs",
    priceKobo: 376_300,
    enabled: true,
    sortOrder: 1,
  },
  {
    code: "ZONE_B",
    name: "ZONE B",
    areas: "Ketu, Ojota, Maryland, Ikosi, Oworoshoki, Alapere",
    deliveryNote: "YOU'LL BE REQUIRED TO COME OUT IF BIKE IS NOT ALLOWED",
    etaLabel: null,
    priceKobo: 483_800,
    enabled: true,
    sortOrder: 2,
  },
  {
    code: "ZONE_C",
    name: "ZONE C",
    areas: "Ikoyi, VI, Lekki 1, Admiralty, Lagos island, Okota, Ikeja, Ilasamaja",
    deliveryNote: "YOU’LL RECEIVE AT GATE IF BIKES AREN’T ALLOWED",
    etaLabel: "Within 48hrs",
    priceKobo: 462_300,
    enabled: true,
    sortOrder: 3,
  },
  {
    code: "ZONE_D",
    name: "ZONE D",
    areas: "Marwa, Chevron, Agungi, Ikate, Agege, Dopemu, Ogba, Festac",
    deliveryNote: "YOU’D BE REQUIRED TO RECEIVE AT ESTATE GATE IF BIKES AREN’T ALLOWED",
    etaLabel: "Within 48hrs",
    priceKobo: 537_500,
    enabled: true,
    sortOrder: 4,
  },
  {
    code: "ZONE_E",
    name: "ZONE E",
    areas: "Ipaja, Agric-Ikorodu, Ayobo, Apapa, Wharf, Meiran",
    deliveryNote: "YOU’D BE REQUIRED TO RECEIVE AT ESTATE GATE IF BIKES AREN’T ALLOWED",
    etaLabel: "Within 48 Hours",
    priceKobo: 913_800,
    enabled: true,
    sortOrder: 5,
  },
  {
    code: "ZONE_F",
    name: "ZONE F",
    areas: "Ajah, Toll Gate, Sango, Ikorodu Inside",
    deliveryNote: "YOU’D BE REQUIRED TO RECEIVE AT ESTATE GATE IF BIKES AREN’T ALLOWED",
    etaLabel: "Within 48 Hours",
    priceKobo: 1_075_000,
    enabled: true,
    sortOrder: 6,
  },
  {
    code: "OUTSIDE_LAGOS_PARK_REGULAR",
    name: "OUTSIDE LAGOS — Park Pickup (Regular)",
    areas: "Interstate park pickup (regular, not bulky package)",
    deliveryNote: "Pick up at designated interstate transport park",
    etaLabel: "1-3 days",
    priceKobo: 913_800,
    enabled: true,
    sortOrder: 7,
  },
  {
    code: "OUTSIDE_LAGOS_PARK_BULKY",
    name: "OUTSIDE LAGOS — Park Pickup (Bulky)",
    areas: "Interstate park pickup (bulky package)",
    deliveryNote: "Pick up at designated interstate transport park",
    etaLabel: "1-3 Days",
    priceKobo: 1_075_000,
    enabled: true,
    sortOrder: 8,
  },
  {
    code: "OUTSIDE_LAGOS_AAJ",
    name: "OUTSIDE LAGOS — Doorstep via AAJ Logistics (0-2kg)",
    areas: "Doorstep delivery outside Lagos (0-2kg parcel)",
    deliveryNote: "Fulfilled via AAJ Logistics",
    etaLabel: "5-7 Days",
    priceKobo: 913_800,
    enabled: true,
    sortOrder: 9,
  },
];

export async function ensureShippingZonesSeeded(prisma: PrismaService): Promise<void> {
  const count = await prisma.shippingZone.count();
  if (count > 0) return;

  await prisma.shippingZone.createMany({
    data: DEFAULT_SHIPPING_ZONES_SEED,
    skipDuplicates: true,
  });
}
