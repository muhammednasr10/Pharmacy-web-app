// Central developer/vendor branding. Edit values here and they propagate
// everywhere (login page, sidebar, settings, and printed PDFs).
export const developerInfo = {
  name: "م.محمد نصر",
  phone: "01125526012",
  // International format (Egypt +20, leading 0 dropped) for wa.me links.
  whatsappNumber: "201125526012",
};

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${developerInfo.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
