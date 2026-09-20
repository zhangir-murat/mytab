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
3. Lower your phone toward the table. Smart Display moves the marker from bottom to top, rotating its contents toward the opposite edge. Picking it up reverses the motion.
4. Use the small controls button in the top-right to switch to Staff. Start the order, mark it ready, deliver it, then mark it delivered.
5. Return to Customer and order another round. No further authorization, payment, or tip screen appears.
6. Open the literal TAB button and choose CLOSE MY TAB after delivery. Choose 18%, 20%, 25%, Custom, or No tip; nothing is preselected.
7. CLOSE & PAY completes one simulated payment and saves a numbered receipt in History.

Add to Tab assembles an unplaced round. Send Order submits its items together. Large orders are delivered in batches of up to two distinct line items so the marker stays readable.

## Smart Motion and the physical marker

Orders open directly into the live marker at the bottom; there is no separate phone-placement screen. The preserved resin renderer uses a single connected SVG path controlled by normalized `flowProgress`. Bottom text fades away during transfer; text reappears at the top already facing the server (180°). Picking up reverses the same geometry.

`DeviceOrientationEvent` supplies beta/gamma, with `DeviceMotionEvent` gravity fallback and screen-orientation correction. Permission only starts listening: the first real reading sets a baseline, and meaningful subsequent movement enables continuous control. Low-pass filtering, a damped spring, dead zones, endpoint hysteresis, and requestAnimationFrame keep input stable. Sensor events are coalesced without rendering the React tree on every event.

The circular rectangle/arrow button always provides manual server-side flipping through the same renderer. A manual choice remains authoritative until tilt changes by more than 12° for at least 160 ms. Missing or stale readings explicitly display **Motion data unavailable**, without substituting an animation.

### Test on iPhone Safari

1. Open the deployed URL in Safari with `?motionDebug=1` appended.
2. Submit an order. Keep **Use tilt simulator** off.
3. While holding the phone upright, tap **Enable Motion** if shown and allow iOS motion access. The permission tap itself must not move the marker.
4. Confirm DeviceOrientation/DeviceMotion events, beta, gamma, raw tilt, and raw/smoothed flow progress change as you physically tilt. Pause halfway, continue flat, then pick up again.
5. Tap the arrow and hold still to test the manual override. Tiny noise should not undo it; a clear physical tilt resumes sensor control.

Motion Debug can be closed with its X and reopened through Demo controls. `?demo=1` also exposes the toggle. For desktop inspection, enable **Use tilt simulator** inside the panel, then scrub UPRIGHT → FLAT. This feeds the same flow state and SVG renderer; it is explicitly separate from real sensor input. Debug controls are hidden by default.

Physical iPhone/Safari hardware remains a required device check; desktop tests validate geometry, sensor-processing logic, manual override, and mobile layout, not physical hardware permissions or sensor delivery.

## Scope and verification

- Shared customer/staff state persists locally, including refresh and same-origin browser-tab updates. Different devices do not share orders.
- No real payments or authorization, card collection, user accounts, or POS integration. Demo card fields are read-only.
- Money uses integer cents; demo tax is 8.875% rounded on the accumulated subtotal. Tips are computed on the pre-tax subtotal. Prior v1 payments are migrated and credited, never charged again.
- Best-effort Wake Lock keeps active markers visible when the browser allows it.
- Core tests cover one-time authorization/settlement, tax and tip calculations, history, migration, tilt geometry, reverse travel, stable settling, and pickup.
- Browser QA covers the customer/staff flow and tilt simulator at 393 × 852. Actual iPhone sensor permissions, hardware, and Safari behavior still need verification on a physical device.

## Source

- `app/page.tsx`: customer and staff flows.
- `components/tab/smart-display.tsx`: sensor access, simulator, animation renderer.
- `lib/marker-motion.ts`: shared tilt/physics engine.
- `lib/tab-state.ts`: tab authorization, orders, closeout, history, migration.
- `app/globals.css`: existing dark design and responsive marker layout.
- `tests/tab.test.mjs`: state and motion regression tests.

The exported hosting manifest has no existing Site project identifier. Dependencies, generated artifacts, runtime state, and credentials are excluded.
