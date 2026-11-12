# ACL-UI-FIRST-001 — MANDATORY FIRST RELEASE & DESIGN APPROVAL GATE
**Status:** Owner-approved implementation sequence, issued 2026-11-12. **Highest precedence within this product roadmap**; retain safety and global AI policy requirements.

## DO THIS FIRST, BEFORE ANY OTHER PRODUCT BUILD
Codex must FIRST **design, implement, test, merge, deploy and verify the actual AdigunCabinLighting landing page and interactive studio interface**. It is unacceptable to spend the first iteration on firmware, gateway, OEM SDK, cloud accounts, AI backend, extra planning documents or unrelated components. The first deliverable is the visible **production website** a real customer can open at `https://adiguncabinlighting.hephzibahbehulah.com/` and approve.

This order overrides the previous Phase A/B sequencing in `docs/CODEX_MASTER_PROMPT.md`: Phase 0 is now **the landing page + functional studio + production website release**. Complete only minimal support infrastructure required for this deliverable (framework, actual simulation engine, automated tests, asset handling and hosting). Once shipped, STOP and obtain the owner's explicit **visual/UI acceptance** before continuing the remainder of the software/hardware roadmap. Do not interpret full implementation/deployment permission as permission to proceed past this approval gate.

## 1. First delivery must include TWO real routes

- **`/` — Public landing page:** a polished, responsive, launch-ready product entrypoint, clear hero using supplied cabin-illumination references where usage rights permit, exact product brand hierarchy, truthful product proposition and capabilities, animated but accessible colored cabin accents, working links to Studio / Capabilities / Safety & Engineering / Documentation / Contact when corresponding content or target exists. No dead buttons, empty sections, fake testimonials, invented corporate customer logos or endorsements, fake compatibility badges, “aircraft certified” claims, fake user counts, fabricated feature claims, or launch countdown.
- **`/studio` — Actual functional Cabin Lighting Studio:** preserve the visual composition of the user-provided futuristic interface concept: midnight-navy outer shell; official corporate identity/header and “AdigunCabinLighting” wordmark; electric-cyan Elektroniker accent; glassy cockpit-style surfaces; cinematic wide cabin viewport; left product rail; right RGBW inspector and swatches; lower timeline and scene presets; subtle gold corporate highlights; no generic admin-dashboard layout. Layout and visual hierarchy must be faithful to the reference concept, not just “similar dark theme”.
- One click from landing page should open Studio without 404. Both pages must work on desktop, tablet and mobile. Use correct static hosting SPA fallback or route generation as suited to GitHub Pages. The CNAME must be retained.

## 2. Functional, not dummy, first release

Every visible interaction must have **real and accurate behavior**, not fake connectivity or staged screens:
- Select an identifiable cabin zone, visually highlight it and show separate stored RGBW values for that zone. A user adjustment changes the local deterministic scene model and the viewport preview, including affected zones only.
- Change R/G/B/W via numeric and accessible sliders, master intensity, editable fade duration, and safe color-picker; maintain normalized channel values and test boundaries.
- Choose at least Boarding, Aurora, Sunrise, Sunset, Dining, Sleep as genuine scene definitions; apply to SIMULATOR, undo/redo, edit/save/reload from local persistence, reset changes, export and import versioned scene files with validation.
- Press Play/Pause/Scrub in an actual deterministic timeline (clock and interpolated RGBW target setpoints), not a decorative moving playhead. Provide current scene time, duration, replay and stop. Respect prefers-reduced-motion.
- Provide an interactive 2D cabin zone model even if a rendered photograph is used behind it. Pan/zoom if advertised; show clear interaction states.
- Implement navigation for every visible active section; hide unimplemented sections or explicitly label as unavailable WITH a truthful explanation, never make deceptive clickable buttons.
- Show **SIMULATION / OFFLINE · NO HARDWARE CONNECTED** visibly at all times. Disconnected means disconnected. Hardware status, sensor readings, physical connection, deployment status and Adigun BOT must not be fabricated. Omit/disable physical I/O and unimplemented AI, explaining their availability honestly, rather than a simulated “LIVE” signal.
- No real aircraft or lighting hardware control in this release. This is a **real, useful offline software application**, not a static mockup. Connected control comes only after later separate approval and safety gates.
- Use correctly sourced images/assets (owner attachments when license/permission is clear) and persist them into the product repo. Do not rely on temporary ChatGPT sandbox links, hotlinks to another vendor's marketing images, or infringe third-party trademarks. If the prior concept PNG/HTML is not available as a permanent source file, reproduce the design from the detailed specifications and screenshot reference; do not present the old 5 MB concept HTML as functional production code.

## 3. Fidelity, experience and corporate identity

Read the user's attached cabin images (blue economy, violet cabin, multicolor VIP) and the previously generated **AdigunCabinLighting_Concept_UI.png** design image when accessible to the implementing agent. Turn that style into a complete UI, not a pasted image; controls must be real hit targets over responsive layouts.

Preserve design-system palette: #0B1220 Navy, #22D3EE HB Elektroniker Cyan, #D4AF37 Corporate Gold, #2563EB Royal Blue, #F8FAFC Ivory. Multicolor pink/violet/amber/teal gradients are **live lighting visualizations**, not new corporate colors. Follow approved typography, single official corporate logo rule (use real verified asset or text fallback), one product wordmark and subtle division label. Dark mode first; require accessible contrast and focus rings. Screens should be visually coherent at 1920×1080, 1440×900, 1280×800, tablet 834×1194 and 390×844. Mobile may reorganize zones and panels but must not hide required functionality. Readability beats visual gimmicks. Animations must never make controls hard to use.

Transient overlays/popovers follow GLOBAL-UI-UX-001: click toggling, click-away, Escape, focus restoration, hover/mouseleave only when appropriate, touch, and **zero underlying layout shift**. All four corporate languages EN/DE/YO/PCM should be completely translated before claiming language availability; otherwise truthfully show English until remaining locales are implemented. Use consistent product-brand assets; do not invent Airbus/Boeing/Diehl/Lufthansa endorsements or replace the corporate logo.

## 4. Release / merge / deploy sequence — OWNER AUTHORIZED FOR FIRST UI RELEASE

The owner explicitly authorizes **merging and deploying the initial, tested first UI release to the existing public product domain**, including routine repository release configuration. The owner also authorizes merging this instruction amendment. Do not request duplicate approval to perform these specific actions. This authorization does NOT waive tests, GitHub branch protection, secret handling, legal rights, or flight/bench safety gates.

1. Inspect current repo, production DNS/CNAME and Pages settings; check applicable shared policy and references. Preserve existing files/history and unrelated work.
2. Create a dedicated implementation branch with scoped commits and a reviewable PR, while retaining this specification.
3. Build both routes and working simulator as described. Keep a reproducible build; prevent a blank homepage. Implement visible accurate empty/error/offline states.
4. Run actual `lint`, `typecheck`, unit tests of RGBW model, Playwright/E2E browser workflows (landing→studio, scene control, save/reopen, timeline, import/export, responsive viewport, no JS errors), a11y checks, and production build. Capture screenshots of landing and Studio from the running build and compare their layout with the approved reference. Fix regressions, don't hide failing tests.
5. Merge the UI PR **only when verified checks pass and repository protection allows**, using the owner's current approval; do not merge broken builds.
6. Deploy the built frontend to the actual product domain using its configured GitHub Pages or verified hosting workflow; preserve `CNAME`, HTTPS and correct routing. Add/update a scoped deployment workflow only if technically needed and authorized by existing repository setup; prevent secret leakage. Inspect CI / deployment logs and **load the real public URL** to verify nonblank landing, navigation, Studio scene interaction, mobile rendering, browser console and correct content version. A GitHub commit or CNAME alone is NOT evidence of deployment. Retry/fix actual failed deployment if in scope; otherwise document the exact blocker and do not pretend it is live.
7. Record final merge SHA, deployment run/URL, post-deploy browser screenshot, date, precise implemented capabilities, tests and unresolved issues in one current project status record. Do NOT promote “works with aircraft” claims.
8. **STOP ALL NEW FEATURE IMPLEMENTATION AFTER VERIFIED FIRST UI RELEASE.** Deliver owner the public URL and screenshots, and explicitly ask: **“Do you approve this landing page and Studio interface as the visual baseline for AdigunCabinLighting?”** No firmware, OEM gateway, large backend build, restyling or second phase until owner responds with clear approval.

## 5. Permanent UI design freeze once owner approves

Upon affirmative owner acceptance:
- Add `docs/APPROVED_UI_BASELINE.md` recording owner approval date, exact approved screenshot(s), production URL and deployment commit SHA, route and viewport coverage, original design tokens and intended interactions. Preserve approved screenshots in a dedicated versioned product folder where rights allow.
- Create reliable Playwright visual regression baselines and component/flow contract tests anchored to approved revision; use objective pixel/semantic diffs reviewed by humans, with tolerances for fonts/anti-aliasing.
- Treat approved **layout, typography, colors, spacing, panel arrangement, navigation, images, animations and interaction patterns as FROZEN**. Future AI, gateway, hardware, security and data features must integrate behind existing interfaces/through documented extension points without silently changing the appearance.
- No global theme reset, template replacement, “modernization”, logo swaps, component library migrations, menu changes or redesign without an **explicit new owner request**. Bug fixes, WCAG/security fixes and required responsive usability corrections may be proposed but their visible effect must be reviewed, not silently adopted.
- New controls must follow existing visual grammar; preserve landing and Studio baseline unless owner expressly approves revision. CI should detect unexpected visual changes and block release.
- Maintain backups/rollback tags and production baseline. Changes to AI, device firmware or gateway must not change approved UI by default.
- Owner rejection/change request: revise only the identified visual issues, re-test, redeploy that visual revision if authorized, and repeat this exact approval gate. Do not proceed with hardware/software roadmap before acceptance.

## 6. Deliverable and explicit acceptance checklist

**Acceptance is NOT complete until:**
- [ ] Both `/` and `/studio` are publicly loading over HTTPS at the correct domain.
- [ ] Screens resemble the original design concept in layout, lighting visuals, hierarchy and brand (owner approval still outstanding until confirmed).
- [ ] Scene selection, zone-specific RGBW, fades/timeline, save/reload and import/export genuinely work in offline SIMULATION.
- [ ] The app shows truthful offline/no-hardware status; no unimplemented functionality is misrepresented as live.
- [ ] Real device control is absent/locked; no bypassable aircraft/bench paths.
- [ ] Responsive + accessible + no-layout-shift behavior is tested with reports.
- [ ] CI/build and postdeploy smoke tests pass on the deployed revision.
- [ ] Source PR is merged, production deployment is verified, and screenshots/links sent to owner.
- [ ] Codex has stopped and is waiting for owner UI approval.

**Then—and only then—resume master build phases for AI, gateway, bench firmware, OEM SDK, system safety and certification planning, preserving the approved UI.**

### What not to claim
Do not say **“deployed”** until the real website is verified. Do not call a concept screenshot a working app. Do not call an offline simulator a cabin-management connection. Do not call a product landing page certification. Do not say **“UI approved”** until the owner personally accepts it.
