# Turning on Square payments

How it works: a shopper fills the basket and taps **Pay securely with Square**. The site sends the basket to a small helper (`payments/worker.js`) running free on Cloudflare. The helper prices the basket from its own copy of the catalog, asks Square for a secure payment page, and sends the shopper there. After paying, they come back to your site and see a thank-you message. The order, payment and shipping address show up in your Square Dashboard.

Your Square key lives only in Cloudflare's settings. It is never in the website code or on GitHub. Never paste it into a chat, email or text.

You'll do this twice: first in **Sandbox** (test mode, no real money), then **Production** (real money).

## 1. Get your Square details (about 10 minutes)

1. Sign up at https://squareup.com, connect your bank account, and finish identity checks.
2. Go to https://developer.squareup.com/apps and sign in with the same account.
3. Click **+** (Create an application) and name it `Herb Haven website`.
4. Open the app. At the top, make sure **Sandbox** is selected.
5. Under **Credentials**, copy the **Sandbox Access token**. Keep it somewhere safe for step 2.
6. In the left menu, open **Locations** and copy the **Location ID** (it looks like `L8X2ABC...`).

## 2. Create the checkout helper on Cloudflare (about 10 minutes)

1. Sign up for free at https://dash.cloudflare.com/sign-up.
2. In the left menu, open **Workers & Pages**, then click **Create** and **Create Worker**.
3. Name it `herb-haven-checkout` and click **Deploy**.
4. Click **Edit code**. Delete everything in the editor, paste in all of `payments/worker.js` from the GitHub repo (https://github.com/fern360/healing-herb-haven/blob/main/payments/worker.js, then click the **Copy raw file** button), and click **Deploy**.
5. Go back to the worker and open **Settings**, then **Variables and Secrets**. Add these four:

   | Name | Type | Value |
   |---|---|---|
   | `SQUARE_ACCESS_TOKEN` | **Secret** | the Sandbox Access token from step 1 |
   | `SQUARE_LOCATION_ID` | Text | the Location ID from step 1 |
   | `SQUARE_ENV` | Text | `sandbox` |
   | `SITE_URL` | Text | `https://fern360.github.io/healing-herb-haven/` |

6. Click **Deploy** (or **Save and deploy**).
7. Copy the worker's address, shown near the top. It looks like `https://herb-haven-checkout.yourname.workers.dev`.

## 3. Connect the website

Send the worker address from step 2.7 to Claude (it's not a secret), or set it yourself: in `healing-herbs-haven.html`, change

```js
const CHECKOUT_URL = "";
```

to your address, then run `sh build.sh`, commit and push.

## 4. Test with fake money

1. Open https://fern360.github.io/healing-herb-haven/, add herbs, go to checkout, and tap **Pay securely with Square**.
2. On Square's test page, pay with test card `4111 1111 1111 1111`, any future expiry date, CVV `111`, and any ZIP code.
3. You should land back on your site with a thank-you message and an empty basket.
4. Check the order in the Sandbox Dashboard (in the Developer Console, open your app, then **Sandbox test accounts** and **Open in Square Dashboard**).

## 5. Go live with real money

1. In the Developer Console, switch the toggle from **Sandbox** to **Production**.
2. Copy the **Production Access token** and your real **Location ID**.
3. In Cloudflare, update the variables: `SQUARE_ACCESS_TOKEN` to the production token, `SQUARE_LOCATION_ID` to the production location, and `SQUARE_ENV` to `production`. Deploy.
4. Place one small real order yourself to confirm, then refund it from the Square Dashboard.

## Good to know

- **Changing prices:** prices live in two places, the website (`healing-herbs-haven.html`) and the helper (`payments/worker.js`). Change both, or ask Claude to.
- **Sales tax:** not added yet. If you need to collect it, turn on tax in your Square Dashboard settings and ask Claude to add it to the helper.
- **Order alerts:** turn on email or push notifications for online payments in the Square Dashboard or the Square app.
- **Texting still works:** shoppers can always tap **Text my order instead**, and if checkout is ever down, the site tells them to text.
