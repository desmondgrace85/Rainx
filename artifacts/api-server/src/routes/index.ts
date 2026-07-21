import { Router, type IRouter } from "express";
import healthRouter from "./health";
import candlesRouter from "./candles";
import proxyRouter from "./proxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/candles", candlesRouter);
router.use(proxyRouter);

export default router;
