import { Router, type IRouter } from "express";
import healthRouter from "./health";
import candlesRouter from "./candles";
import proxyRouter from "./proxy";
import pushRouter from "./push";
import publicProfileRouter from "./publicProfile";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/candles", candlesRouter);
router.use(pushRouter);
router.use(publicProfileRouter);
router.use(proxyRouter);

export default router;
