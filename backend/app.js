require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookie_parser = require("cookie-parser");

const { connect_db } = require("./src/lib/db");

const webhook_routes = require("./routes/webhook");
const auth_routes = require("./routes/auth_route");
const notification_routes = require("./routes/notification_routes");
const agent_routes = require("./routes/agent_routes");
const wallet_routes = require("./routes/wallet_routes");

const { start_flight_reminder_job } = require("./jobs/flight_reminder");
const { start_reconciliation_job } = require("./jobs/reconciliation");

const app = express();

// IMPORTANT: this must be mounted BEFORE express.json() below. The webhook
// route needs the raw request body (as bytes) to verify Nomba's signature —
// if the global JSON parser touches the request first, those raw bytes are
// gone and every signature check will fail.
app.use("/api/webhook", webhook_routes);

// Everything else uses normal JSON parsing.
app.use(express.json());
app.use(cookie_parser());

// credentials: true is required for the httpOnly refresh_token cookie to
// work across your frontend (Next.js) and backend domains.
const allowed_origins = [process.env.FRONTEND_URL, "http://localhost:3000"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowed_origins.includes(origin)) return callback(null, true);
      return callback(new Error("Blocked by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  }),
);
app.use("/auth", auth_routes);
app.use("/notifications", notification_routes);
app.use("/agent", agent_routes);
app.use("/wallet", wallet_routes);
// app.use("/bookings", booking_routes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 4000;

// Connect to the database first, THEN start listening — avoids accepting
// requests before Mongoose is actually ready to serve them.
connect_db().then(() => {
  start_flight_reminder_job();
  start_reconciliation_job();

  app.listen(PORT, () => {
    console.log(`FlyMate backend running on port ${PORT}`);
  });
});
