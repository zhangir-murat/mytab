# TAB

Mobile-first bar ordering prototype. Open a tab once, order throughout the night, and place your phone face-up. Its bright numbered marker helps staff find the right delivery. Tip and pay once when you close your tab.

## Run locally

Requires Node.js 22.13 or newer and pnpm 11.25.0.

```sh
git clone https://github.com/zhangir-murat/mytab.git
cd mytab
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by the server, normally http://localhost:5173.

```sh
pnpm test
pnpm build
pnpm start
```

The production build targets Cloudflare Workers through Vinext. `pnpm start` previews the built Worker locally; it does not publish anything.

## Try the complete flow

1. Open a tab and authorize simulated Apple Pay, Google Pay, or a demo card. Nothing is charged.
2. Order Spicy Margarita ×2. The first round is #47 with a bright orange marker.
3. Tap SHOW SERVER. The orange resin transfers to the top in 300 ms; tap BRING BACK to return it. Text fades out in transit and reappears already facing the correct edge.
4. Use the small controls button (bottom-left on the live marker) to switch to Staff. Start the order, mark it ready, deliver it, then mark it delivered.
5. Return to Customer and order another round. No further authorization, payment, or tip screen appears.
6. Open the literal TAB button and choose CLOSE MY TAB after delivery. Choose 18%, 20%, 25%, Custom, or No tip; nothing is preselected.
7. CLOSE & PAY completes one simulated payment and saves a numbered receipt in History.

Add to Tab assembles an unplaced round. Send Order submits its items together. Large orders are delivered in batches of up to two distinct line items so the marker stays readable.

## Manual resin marker

Orders open directly into the bottom marker. One connected SVG path morphs from a rounded rectangle through a narrow resin neck into the opposite rectangle. Geometry is a deterministic function of `flowProgress`; the same path runs in reverse. Manual travel lasts 300 ms, uses requestAnimationFrame without per-frame React state, and can reverse from its current shape on repeated taps. Text fades away during transfer and returns at its fixed 0° or 180° orientation. Reduced motion uses the correct endpoint without the morph.

The live header is 50 px plus the top safe-area inset. The resin stage begins below it and reserves the bottom safe area. Experimental orientation/motion code remains dormant behind `SMART_MOTION_ENABLED=false`: no listeners, permission prompts, automatic motion, or debug controls appear, including with old debug query parameters.

## Scope and verification

- Shared customer/staff state persists locally, including refresh and same-origin browser-tab updates. Different devices do not share orders.
- No real payments or authorization, card collection, user accounts, or POS integration. Demo card fields are read-only.
- Money uses integer cents; demo tax is 8.875% rounded on the accumulated subtotal. Tips are computed on the pre-tax subtotal. Prior v1 payments are migrated and credited, never charged again.
- Best-effort Wake Lock keeps active markers visible when the browser allows it.
- Core tests cover one-time authorization/settlement, tax and tip calculations, history, migration, tilt geometry, reverse travel, stable settling, and pickup.
- Browser QA covers manual marker endpoints at 393 × 852; engine tests verify 300 ms travel, rapid reversal, and connected intermediate geometry. Physical iPhone Safari hardware was not available for testing.

## Source

- `app/page.tsx`: customer and staff flows.
- `components/tab/smart-display.tsx`: sensor access, simulator, animation renderer.
- `lib/marker-motion.ts`: shared tilt/physics engine.
- `lib/tab-state.ts`: tab authorization, orders, closeout, history, migration.
- `app/globals.css`: existing dark design and responsive marker layout.
- `tests/tab.test.mjs`: state and motion regression tests.

The exported hosting manifest has no existing Site project identifier. Dependencies, generated artifacts, runtime state, and credentials are excluded.
