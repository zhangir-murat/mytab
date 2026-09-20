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

## Smart Display

Real input uses `DeviceOrientationEvent`, with `DeviceMotionEvent` gravity fallback and screen-orientation correction. Sensor data goes through a dead zone, low-pass filter, damped spring, and requestAnimationFrame rendering. Stable flat readings settle after 650 ms; pickup resumes motion. Only the marker content rotates, not the app. Safe-area insets protect notch and home-indicator areas.

On supported iPhones, tap ENABLE when asked to enable Smart Display. This must run over HTTPS and permission must be granted from a user gesture. Permission denial, missing APIs, or missing readings leave a stable manual display with **Flip server side**. Sensors cannot determine where a server stands from flat yaw alone; the flip control corrects placement when needed.

For desktop testing, open `/?demo=1` and enable Tilt simulator in Demo controls. It uses the same animation engine as real sensor input. The 90° → 0° slider covers bottom → middle → top and 0° → 180° text rotation. Reverse server side tests the opposite edge. Simulator controls are hidden by default in production.

## Scope and verification

- Shared customer/staff state persists locally, including refresh and same-origin browser-tab updates. Different devices do not share orders.
- No real payments or authorization, card collection, user accounts, or POS integration. Demo card fields are read-only.
- Money uses integer cents; demo tax is 8.875% rounded on the accumulated subtotal. Tips are computed on the pre-tax subtotal. Prior v1 payments are migrated and credited, never charged again.
- Best-effort Wake Lock keeps active markers visible when the browser allows it.
- Core tests cover one-time authorization/settlement, tax and tip calculations, history, migration, tilt geometry, reverse travel, stable settling, and pickup.
- Browser QA covers the customer/staff flow and tilt simulator at 390 × 844. Actual iPhone sensor permissions, hardware, and Safari behavior still need verification on a physical device.

## Source

- `app/page.tsx`: customer and staff flows.
- `components/tab/smart-display.tsx`: sensor access, simulator, animation renderer.
- `lib/marker-motion.ts`: shared tilt/physics engine.
- `lib/tab-state.ts`: tab authorization, orders, closeout, history, migration.
- `app/globals.css`: existing dark design and responsive marker layout.
- `tests/tab.test.mjs`: state and motion regression tests.

The exported hosting manifest has no existing Site project identifier. Dependencies, generated artifacts, runtime state, and credentials are excluded.
