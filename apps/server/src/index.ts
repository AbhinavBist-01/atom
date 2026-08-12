import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import webhookRouter from "./webhooks/github.js";
import reposRouter from "./routes/repos.js";
import issuesRouter from "./routes/issues.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// API Routes & Webhooks
app.use("/webhooks/github", webhookRouter);
app.use("/api/repos", reposRouter);
app.use("/api/issues", issuesRouter);

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
