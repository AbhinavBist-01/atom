import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import path from "path";
import dotenv from "dotenv";

// Load root .env file (two levels up from apps/server/)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgrespassword@localhost:5432/atom_db",
  },
});
