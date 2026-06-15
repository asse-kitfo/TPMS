import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sessionsRouter from "./sessions";
import checksRouter from "./checks";
import tradesRouter from "./trades";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/sessions", sessionsRouter);
router.use("/checks", checksRouter);
router.use("/trades", tradesRouter);
router.use("/stats", statsRouter);

export default router;
