# TAB

Mobile-first bar ordering prototype. Order a round, confirm a simulated payment, and place your phone face-up: its bright marker helps staff identify the delivery.

## Run locally

Requires Node.js 22.13 or newer and pnpm 11.25.0 (the version declared in package.json).

```sh
git clone https://github.com/zhangir-murat/mytab.git
cd mytab
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by the development server, normally http://localhost:5173.

```sh
pnpm build
pnpm start
```

The production build targets Cloudflare Workers through Vinext. `pnpm start` previews the built Worker locally; it does not publish anything.

## Try the prototype

1. Choose Spicy Margarita, set quantity to 2, and tap Order.
2. Confirm a simulated Apple Pay, Google Pay, or card payment.
3. The first order is #47 with an orange phone marker.
4. Use the small controls button in the top-right to switch to Staff.
5. Start the order, mark it ready, deliver it, and mark it delivered.
6. Switch back to Customer to see the matching state and order another round.

Add to Tab supports multi-item checkout. Your tab retains previous rounds and can be closed after delivery. Large orders are delivered in batches of up to two distinct line items so the marker stays readable.

## Prototype scope

- Complete venue menu, item sheets, quantities, and simple modifiers.
- Fast ordering and multi-item ordering.
- Simulated payment confirmation; card fields contain read-only dummy details.
- Shared customer/staff order state stored locally in the browser, including refresh persistence and same-origin browser-tab updates.
- Staff queues and a dedicated delivery view with matching marker colors.
- Running tab history, repeat rounds, and tab closure.
- Responsive layouts, reduced-motion support, and a best-effort screen wake lock.

No real charges, card collection, payment provider, authentication, or POS integration. Different devices do not share orders. Browser storage and wake-lock availability depend on browser support and settings.

## Source

- `app/page.tsx`: customer and staff flows, shared state, reusable controls.
- `app/globals.css`: responsive dark theme and marker animation.
- `app/layout.tsx`: page metadata.
- `components/ui/`: bundled accessible UI primitives.
- `public/favicon.svg`: TAB icon.
- `vite.config.ts`, `build/`, `scripts/`: Vinext/Cloudflare build support.

The export preserves the original dependency versions and lockfile. The hosting manifest has no existing Site project identifier, and dependencies, build artifacts, runtime state, and credentials are excluded.
