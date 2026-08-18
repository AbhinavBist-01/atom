import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import webhookRouter from "./webhooks/github.js";
import reposRouter from "./routes/repos.js";
import issuesRouter from "./routes/issues.js";
import runsRouter from "./routes/runs.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = [
  "http://localhost:3000",
  process.env.CLIENT_URL,
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Alternatively fallback or accept configured
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "x-requested-with"],
    exposedHeaders: ["Set-Cookie"],
  })
);

// Mount Better Auth router for GitHub OAuth login flow
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

// API Routes & Webhooks
app.use("/webhooks/github", webhookRouter);
app.use("/api/repos", reposRouter);
app.use("/api/issues", issuesRouter);
app.use("/api/runs", runsRouter);

// Frontend route safety redirects (in case OAuth or user opens port 4000 directly)
const FRONTEND_URL = process.env.CLIENT_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
app.get(["/workspace", "/workspace/*", "/issues", "/issues/*"], (req, res) => {
  res.redirect(`${FRONTEND_URL}${req.originalUrl}`);
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "atom-server",
    phase: 2,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`ATOM Server running on http://localhost:${PORT}`);
});
