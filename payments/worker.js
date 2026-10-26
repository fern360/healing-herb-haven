// Healing Herb Haven: Square checkout helper (Cloudflare Worker).
//
// The website basket sends { items: [{id, size, qty}], express, email, address } here.
// This worker prices everything from its OWN catalog below (never trusting prices sent
// by the browser), asks Square for a secure payment link, and returns { url }.
//
// Settings (Cloudflare dashboard > your worker > Settings > Variables and Secrets):
//   SQUARE_ACCESS_TOKEN  (Secret)  Square access token. Sandbox token while testing.
//   SQUARE_LOCATION_ID   (Text)    Square location id, e.g. "L8X2..."
//   SQUARE_ENV           (Text)    "sandbox" while testing, "production" when live
//   SITE_URL             (Text)    https://www.healing-herb-haven.com/
//
// KEEP IN SYNC: if you change a price, size or product on the website
// (healing-herbs-haven.html), change it here too, or checkout totals will differ.

const PRODUCTS = {
  chamomile:   { name: "Chamomile Flowers", price: 6, prices: { "4oz": 23, "1lb": 88 } },
  peppermint:  { name: "Peppermint Leaf", price: 2.75, prices: { "4oz": 15, "1lb": 56 } },
  lavender:    { name: "Lavender Buds", price: 6.75, prices: { "4oz": 26, "1lb": 100 } },
  calendula:   { name: "Calendula Petals", price: 5, prices: { "4oz": 19, "1lb": 71 } },
  elderberry:  { name: "Elderberries", price: 5.25, prices: { "4oz": 9, "1lb": 32 } },
  ashwagandha: { name: "Ashwagandha Root", price: 4.75, prices: { "4oz": 15, "1lb": 56 } },
  turmeric:    { name: "Turmeric Root", price: 2.5, prices: { "4oz": 17, "1lb": 64 } },
  rosemary:    { name: "Rosemary Leaf", price: 2.4, soldOut: true },
  hibiscus:    { name: "Hibiscus Flowers", price: 3, prices: { "4oz": 13, "1lb": 48 } },
  lemonbalm:   { name: "Lemon Balm", price: 4.75, prices: { "4oz": 18, "1lb": 68 } },
  nettle:      { name: "Nettle Leaf", price: 3.5, prices: { "4oz": 11, "1lb": 40 } },
  rose:        { name: "Rose Petals", price: 3.75, prices: { "4oz": 9, "1lb": 32 } },
  echinacea:   { name: "Echinacea Herb", price: 7.25, prices: { "4oz": 20, "1lb": 76 } },
  thyme:       { name: "Thyme Leaf", price: 2.75, prices: { "4oz": 10, "1lb": 36 } },
  ginger:      { name: "Ginger Root", price: 4.5, prices: { "4oz": 10, "1lb": 36 } },
  licorice:    { name: "Licorice Root", price: 4, prices: { "4oz": 28, "1lb": 108 } },
  mullein:     { name: "Mullein Leaf", price: 4, prices: { "4oz": 18, "1lb": 68 } },
  oregano:     { name: "Oregano Leaf", price: 4.75, prices: { "4oz": 18, "1lb": 68 } },
  clove:       { name: "Whole Cloves", price: 3.75 },
  "raspberry-leaf": { name: "Red Raspberry Leaf", price: 3, prices: { "4oz": 14, "1lb": 52 } },
  "holy-basil":  { name: "Holy Basil (Tulsi)", price: 3.6 },
  guanabana:   { name: "Guanabana Leaf (Soursop)", price: 4.25 },
  "black-cumin": { name: "Black Cumin Seed", price: 2.5, prices: { "4oz": 18, "1lb": 68 } },
  horsetail:   { name: "Horsetail Herb", price: 2.5, prices: { "4oz": 17, "1lb": 64 } },
  "cats-claw": { name: "Cat's Claw Bark", price: 4.5, prices: { "4oz": 9, "1lb": 32 } },
  "restful-blend": { name: "Restful Night Blend", price: 6.0 },
  "winter-blend":  { name: "Winter Wellness Blend", price: 6.5 },
  "digest-blend":  { name: "After-Dinner Digest Blend", price: 5.75 },
  "calm-blend":    { name: "Calm & Bright Blend", price: 6.25 },
  "bp-blend":      { name: "High Blood Pressure Tea", price: 6.25 },
  "pcos-blend":    { name: "PCOS Tea", price: 6.0 },
  "quiet-mind":    { name: "Quiet the Mind Remedy", price: 6.5 },
  "menstrual-mix": { name: "Menstrual Mix", price: 6.25 },
  "oregano-eo":    { name: "Oregano Essential Oil", price: 14.0, oil: true },
};
// Dried herbs sell by weight, oils by volume
const SIZES = {
  "1oz":   { label: "1 oz", mult: 1, kind: "herb" },
  "4oz":   { label: "4 oz", mult: 3.4, kind: "herb" },
  "1lb":   { label: "1 lb", mult: 11, kind: "herb" },
  "1floz": { label: "1 fl oz", mult: 1, kind: "oil" },
  "2floz": { label: "2 fl oz", mult: 1.8, kind: "oil" },
  "4floz": { label: "4 fl oz", mult: 3.2, kind: "oil" },
};
const SHIPPING_CENTS = 695, FREE_AT_CENTS = 5000, EXPRESS_CENTS = 900;
const TAX_PERCENT = "7.25";   // sales tax on products, not shipping. Keep in sync with the website's TAX_RATE.

// Same rounding as the website's priceFor()
const priceCents = (price, mult) => Math.round((Math.round(price * mult * 4) / 4 - (mult > 1 ? 0.05 : 0)) * 100);

function cors(origin, env) {
  const site = new URL(env.SITE_URL || "https://www.healing-herb-haven.com/").origin;
  return {
    "Access-Control-Allow-Origin": origin === site ? origin : site,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}
const json = (body, status, headers) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

export default {
  async fetch(request, env) {
    const headers = cors(request.headers.get("Origin"), env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return json({ error: "Use POST." }, 405, headers);

    let body;
    try { body = await request.json(); } catch { return json({ error: "Send the basket as JSON." }, 400, headers); }

    const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
    const lineItems = [];
    let subtotal = 0;
    for (const it of items) {
      const p = PRODUCTS[String(it.id)], s = SIZES[String(it.size)];
      const qty = Math.round(Number(it.qty));
      if (!p || !s || s.kind !== (p.oil ? "oil" : "herb") || !(qty >= 1 && qty <= 50)) return json({ error: "Your basket has an item we don't recognize. Refresh the page and try again." }, 400, headers);
      if (p.soldOut) return json({ error: `Sorry, ${p.name} is out of stock. Remove it from your basket and try again.` }, 400, headers);
      const cents = p.prices && p.prices[String(it.size)] != null
        ? Math.round(p.prices[String(it.size)] * 100)  // set per-size price, same as the website
        : priceCents(p.price, s.mult);
      subtotal += cents * qty;
      lineItems.push({ name: `${p.name}, ${s.label}`, quantity: String(qty), base_price_money: { amount: cents, currency: "USD" } });
    }
    if (!lineItems.length) return json({ error: "Your basket is empty." }, 400, headers);

    const express = body.express === true;
    const shipping = (subtotal >= FREE_AT_CENTS ? 0 : SHIPPING_CENTS) + (express ? EXPRESS_CENTS : 0);

    const email = typeof body.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ? body.email.slice(0, 200) : undefined;
    const a = body.address && typeof body.address === "object" ? body.address : {};
    const clip = v => (typeof v === "string" ? v.trim().slice(0, 200) : "");
    const [first, ...rest] = clip(a.name).split(/\s+/);
    const buyerAddress = clip(a.line1) ? {
      address_line_1: clip(a.line1), locality: clip(a.city), postal_code: clip(a.zip), country: "US",
      first_name: first || undefined, last_name: rest.join(" ") || undefined,
    } : undefined;

    const site = env.SITE_URL || "https://www.healing-herb-haven.com/";
    const api = env.SQUARE_ENV === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";

    const res = await fetch(`${api}/v2/online-checkout/payment-links`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
        "Square-Version": "2024-10-17",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: env.SQUARE_LOCATION_ID,
          line_items: lineItems,
          taxes: [{ uid: "sales-tax", name: "Sales tax", percentage: TAX_PERCENT, scope: "ORDER", type: "ADDITIVE" }],
        },
        checkout_options: {
          redirect_url: site.replace(/#.*$/, "") + "#thanks",
          ask_for_shipping_address: true,
          allow_tipping: false,
          ...(shipping ? { shipping_fee: { name: express ? "Express shipping (1-2 days)" : "Standard shipping (3-5 days)", charge: { amount: shipping, currency: "USD" } } } : {}),
          merchant_support_email: env.SUPPORT_EMAIL || undefined,
        },
        pre_populated_data: { buyer_email: email, buyer_address: buyerAddress },
        payment_note: "Healing Herb Haven web order",
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.payment_link?.url) {
      console.log("Square error", res.status, JSON.stringify(data.errors || data));
      return json({ error: "We couldn't start checkout right now. Please text your order to (760) 916-2700." }, 502, headers);
    }
    return json({ url: data.payment_link.url, orderId: data.payment_link.order_id }, 200, headers);
  },
};
