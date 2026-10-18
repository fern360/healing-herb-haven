# Healing Herb Haven

Online herb shop: 16 herbs with size pricing, a basket, text-to-order checkout, an "Ask the Herbalist" AI chat, and a Contact page. Orders and questions go by text to (760) 916-2700.

Live site: https://www.healing-herb-haven.com/

## Files
- `healing-herbs-haven.html`: the shop page source (also published as a Claude artifact)
- `index.html`: the full web page GitHub Pages serves, built from the source
- `payments/worker.js`: Square checkout helper for Cloudflare; see `PAYMENTS.md` to turn on card payments
- `build.sh`: rebuilds `index.html`; run `sh build.sh` after editing the source
- `logo.jpg`: logo used on the page; `logo-original.webp`: full-size original

## Notes
- Checkout takes no payment. Shoppers text their order and you reply with payment details.
- The AI chat only shows when the page is opened as a Claude artifact; on GitHub Pages it stays hidden.
