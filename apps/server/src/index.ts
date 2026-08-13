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

app.use(cors());

// Mount Better Auth router for GitHub OAuth login flow
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

// API Routes & Webhooks
app.use("/webhooks/github", webhookRouter);
app.use("/api/repos", reposRouter);
app.use("/api/issues", issuesRouter);
app.use("/api/runs", runsRouter);

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
