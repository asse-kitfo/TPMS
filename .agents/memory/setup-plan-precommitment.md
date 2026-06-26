---
name: Setup Plan Pre-commitment System
description: Architecture and key decisions for the plan pre-commitment feature added to ApexTerm
---

## What was built
Full setup plan pre-commitment system: traders build plans while calm; Trade Gate becomes a plan-match check.

## Key files
- `lib/db/src/schema/plans.ts` — setupPlansTable (asset, direction, entryZone, stopLoss, takeProfit, setupGrade, thesis, invalidationCondition, expiresAt)
- `lib/db/src/schema/checks.ts` — added planId (integer), planMatchStatus (text: MATCHED/NO_PLAN/SKIPPED)
- `lib/api-zod/src/generated/api.ts` — CreateSetupPlanBody, PlanMatchStatusEnum, SubmitCheckBodyWithPlanMatch (manually added, not generated)
- `lib/api-client-react/src/generated/api.schemas.ts` — SetupPlan interface, PlanMatchStatus type, CheckInput extended with planId/planMatchStatus
- `lib/api-client-react/src/generated/api.ts` — useListSetupPlans, useCreateSetupPlan, useDeleteSetupPlan, useGetPlanMatchOutcomes hooks (manually added)
- `artifacts/api-server/src/routes/plans.ts` — CRUD for setup plans
- `artifacts/api-server/src/routes/checks.ts` — plan-match verdict logic, server-side validation of MATCHED+planId, chase detection
- `artifacts/api-server/src/routes/stats.ts` — /plan-match-outcomes endpoint (check-level attribution, not session-wide)
- `artifacts/trading-psychology/src/pages/plans.tsx` — Setup Plan Library page
- `artifacts/trading-psychology/src/pages/check.tsx` — PLAN_SELECT phase between RULES_CHECK and MAIN_CHECK
- `artifacts/trading-psychology/src/pages/analytics.tsx` — Plan match outcomes chart
- `artifacts/trading-psychology-mobile/app/(tabs)/index.tsx` — PlansBanner component

## Critical design decisions

**Server enforces plan-match invariants (client-reported values are not trusted):**
- MATCHED without planId → coerced to NO_PLAN
- MATCHED with expired planId → coerced to NO_PLAN
- MATCHED with planId not in DB → coerced to NO_PLAN
- SKIPPED and NO_PLAN both force REDUCE_RISK downgrade

**Why:** Client can't be trusted to self-report under pressure. The gate only has integrity if the server validates.

**Chase detection:** Only runs for genuinely MATCHED plans. If plan age < 5 min AND session has ≥1 loss → REDUCE_RISK.

**Analytics:** Win rate attributed at check level (find next trade in same session after each check timestamp) — avoids double-counting when a session has checks in multiple plan-match statuses.

**Zod import pattern:** API server cannot import `zod` directly (not in external bundle). All schemas must come from `@workspace/api-zod`. Any new validation schemas go in `lib/api-zod/src/generated/api.ts`.

**DB migration:** Run `cd lib/db && npx drizzle-kit push` to apply schema changes. Already applied for setup_plans table and checks.plan_id/plan_match_status columns.
