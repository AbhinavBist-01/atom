import dotenv from "dotenv";
import { betterAuth } from "better-auth";

dotenv.config();

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:4000",
  trustedOrigins: [
    "http://localhost:3000",
    process.env.CLIENT_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean) as string[],
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      scope: ["repo", "read:user", "user:email"],
    },
  },
});
