---
name: Rande Howell Framework Integration
description: Key patterns for the trading psychology app built around Howell's seminar — archetypes, inner voice classifier, alibi system, file locations, and conventions.
---

**Why:** The app is explicitly built around Rande Howell's 5-step mind retraining process from his seminar. All coaching text must reference his framework (amygdala hijack, committee of the mind, observer self, empowered programs).

**How to apply:** When adding features, use Howell's language. Don't use generic CBT language alone — always anchor it to his specific concepts.

## Archetype System (Hub screen — index.tsx)
- WARRIOR (zap icon, #ef4444) — courage, faces execution risk
- RULER (sliders icon, #f59e0b) — discipline, rule enforcement
- CAREGIVER (heart icon, #22c55e) — self-compassion, prevents revenge trading
- SAGE (eye icon, #6366f1) — impartiality, observer self
- Persisted via `loadArchetype()` / `saveArchetype()` in `lib/storage.ts`
- Shows on session card during active session with archetype's tagline

## Inner Voice Classifier (Thought Lab — thought.tsx)
- 4 voices: Inner Critic, Orphan, Survival Brain, Entitled Ego
- Inserted as "VOICE" step between THOUGHT and DISTORTION
- Step order: SITUATION → BODY_SCAN → EMOTION → THOUGHT → VOICE → DISTORTION → REFRAME → ACTION
- Each voice has: examples, Howell insight, coaching reframe

## Alibi Awareness (Monitor — monitor.tsx)
- Added before post-trade emotion section in debrief
- 3 levels: Clean execution, Minor rationalization, Full alibi
- "Full alibi" auto-prefixes debrief notes with "[Alibi detected]"

## File Locations
- Hub: `artifacts/trading-psychology-mobile/app/(tabs)/index.tsx`
- Thought Lab: `artifacts/trading-psychology-mobile/app/(tabs)/thought.tsx`
- Gate: `artifacts/trading-psychology-mobile/app/(tabs)/gate.tsx`
- Monitor: `artifacts/trading-psychology-mobile/app/(tabs)/monitor.tsx`
- HijackProtocol: `artifacts/trading-psychology-mobile/components/HijackProtocol.tsx`
- Storage: `artifacts/trading-psychology-mobile/lib/storage.ts`
- Icons: `artifacts/trading-psychology-mobile/components/Icon.tsx` (SVG-based, no icon fonts)

## Available Icons
home, check-circle, bar-chart-2, zap, list, sliders, shield, check, alert-octagon, power, alert-triangle, play, wind, book-open, crosshair, lock, x, x-circle, chevron-left, chevron-right, eye, plus, info, bookmark, trash-2, edit-2, edit-3, log-out, minimize-2, pause-circle, heart, anchor, users, star, activity, target

## Key Howell Concepts to Preserve
- "Committee of the Mind" — rival emotional programs
- Amygdala hijack — 5-step HijackProtocol modal (cannot skip)
- Observer Self — separate identity from automatic thoughts
- Diaphragmatic breathing under stress (not just calm)
- Alibi cycle — rational brain justifies emotional decisions post-hoc
- Ambush predator model (cougar) — patient waiting for A+ setups
- Certainty is a false goal — probability mindset required

## Workflow Notes
- Use "Mobile App" workflow (port 3001) — NOT "artifacts/trading-psychology-mobile: expo"
- "Trading Psychology System" workflow (port 5000) for the web app
- "artifacts/trading-psychology: web" workflow consistently fails — ignore it
