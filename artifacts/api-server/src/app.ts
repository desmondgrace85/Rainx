import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { getDb, sendPushToUser } from "./lib/pushNotify";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ── Payment confirmation push notifications ─────────────────────────────────
// Listen for payments.status → "confirmed" and push a notification to the user.
const db = getDb();
if (db) {
  db.channel("payment-confirmations")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "payments" },
      async (payload: any) => {
        const newRow = payload.new as { status?: string; user_id?: string; plan?: string };
        if (newRow.status !== "confirmed" || !newRow.user_id) return;
        const planLabel =
          newRow.plan === "weekly"  ? "Weekly"  :
          newRow.plan === "monthly" ? "Monthly" :
          newRow.plan === "yearly"  ? "Yearly"  : "Premium";
        try {
          await sendPushToUser(
            newRow.user_id,
            "Subscription Confirmed! 🎉",
            `Your ${planLabel} subscription is now active. Enjoy RainX Premium!`,
            { category: "money", url: "/" }
          );
        } catch {}
      }
    )
    .subscribe();
}

export default app;
