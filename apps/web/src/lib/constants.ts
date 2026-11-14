/**
 * Givvly Global Site & Concierge Constants
 * Reusable contact information, concierge hours, and operational details.
 */
export const SITE_CONTACT = {
  email: "hellogivvly@gmail.com",
  phone: "+234 802 917 6372",
  phoneRaw: "2348029176372",
  whatsappNumber: "2348029176372",
  whatsappDisplay: "+234 802 917 6372",
  whatsappUrl: "https://wa.me/2348029176372",
  mailto: "mailto:hellogivvly@gmail.com",
  hours: "Monday – Saturday, 8:00 AM – 7:00 PM WAT",
  location: "Lagos, Nigeria",
  coverage: "Delivering across Lagos and nationwide across Nigeria",
  websiteUrl: "https://givvly.store",
} as const;

export const SUPPORT_EMAIL = SITE_CONTACT.email;
export const SUPPORT_PHONE = SITE_CONTACT.phone;
export const WHATSAPP_ORDER_NUMBER = SITE_CONTACT.whatsappNumber;
export const WHATSAPP_DISPLAY_PHONE = SITE_CONTACT.whatsappDisplay;
export const WHATSAPP_URL = SITE_CONTACT.whatsappUrl;
export const SUPPORT_MAILTO = SITE_CONTACT.mailto;
export const SUPPORT_HOURS = SITE_CONTACT.hours;
