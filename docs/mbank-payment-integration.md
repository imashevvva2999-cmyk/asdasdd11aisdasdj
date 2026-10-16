# MBANK payment integration — current state and what real integration needs

**Status (2026-10-13): DEMO only.** No official MBANK payment API, SDK, widget
documentation, or merchant credentials exist in this repository. Promotion
campaigns and Studio Pro plans use a clearly labelled **demo checkout**
("Демо MBANK — деньги не списываются"). No real transaction is ever created,
and the UI never claims money was charged. See OQ-10, OQ-14, OQ-15 in
`docs/open-questions.md`.

## Where it plugs in

| Piece | File |
|---|---|
| Adapter interface + demo/live switch | `apps/mobile/src/lib/payments/mbank-payment.ts` |
| In-flight payment state (order, outcome) | `apps/mobile/src/state/payment-store.ts` |
| Demo checkout sheet | `apps/mobile/src/app/sheets/mbank-pay.tsx` |
| Callers | `apps/mobile/src/app/profile/artist/promote.tsx`, `.../dashboard/studio-pro.tsx` |

Flow: caller builds a `PaymentOrder` → `getMbankPaymentAdapter().createSession(order)`
→ demo: opens `/sheets/mbank-pay`; live: redirects to the `checkoutUrl` the
backend returns → outcome (`success` / `cancelled` / `failed`) lands in
`usePaymentStore().result`, and the caller acts only on its own `order.id`.

## Switching to live (once MBANK access exists)

Frontend env (public, no secrets):

- `EXPO_PUBLIC_MBANK_PAYMENT_MODE=live`
- `EXPO_PUBLIC_PAYMENTS_API_URL=https://<your-backend>`

A backend you operate must expose `POST /payments/mbank/sessions` (body:
`PaymentOrder`) returning `{ "checkoutUrl": "<official MBANK widget/checkout URL>" }`,
and must confirm the final status server-to-server before a campaign or plan
is activated.

## Required from MBANK (to request)

1. Merchant / partner agreement and **merchant ID** for Mmusic.
2. **API credentials** (key/secret or client certificate) — server-side only,
   never in the app bundle or `EXPO_PUBLIC_*` variables.
3. **Sandbox + production base URLs** and the payment-session / invoice API spec.
4. **Request-signing scheme** (algorithm, which fields are signed).
5. **Webhook / callback** spec for payment status, plus its signature verification.
6. Allowed **return / cancel URLs** for web (and deep links for iOS/Android).
7. Official **widget / checkout** integration guide (hosted page vs embedded
   widget; iOS Safari and in-app WebView support).
8. Refund, partial-refund and dispute procedures; settlement timing.
9. Brand-usage rules for the MBANK name and logo in the checkout.

Until these are in hand, keep `EXPO_PUBLIC_MBANK_PAYMENT_MODE` unset (demo).
