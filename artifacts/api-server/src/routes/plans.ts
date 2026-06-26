import { Router } from "express";
import { db, setupPlansTable } from "@workspace/db";
import { eq, gt, asc } from "drizzle-orm";
import { CreateSetupPlanBody } from "@workspace/api-zod";

const router = Router();

// List active (non-expired) plans
router.get("/", async (_req, res) => {
  const now = new Date();
  const plans = await db
    .select()
    .from(setupPlansTable)
    .where(gt(setupPlansTable.expiresAt, now))
    .orderBy(asc(setupPlansTable.expiresAt));
  return res.json(
    plans.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      expiresAt: p.expiresAt.toISOString(),
    }))
  );
});

// Get a specific plan
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [plan] = await db.select().from(setupPlansTable).where(eq(setupPlansTable.id, id));
  if (!plan) return res.status(404).json({ error: "Plan not found" });
  return res.json({
    ...plan,
    createdAt: plan.createdAt.toISOString(),
    expiresAt: plan.expiresAt.toISOString(),
  });
});

// Create a new plan
router.post("/", async (req, res) => {
  const parsed = CreateSetupPlanBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error });

  const { expiresInHours, ...rest } = parsed.data;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const [plan] = await db
    .insert(setupPlansTable)
    .values({ ...rest, expiresAt })
    .returning();

  return res.status(201).json({
    ...plan,
    createdAt: plan.createdAt.toISOString(),
    expiresAt: plan.expiresAt.toISOString(),
  });
});

// Delete a plan
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(setupPlansTable).where(eq(setupPlansTable.id, id));
  return res.status(204).send();
});

export default router;
