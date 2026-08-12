import { betterAuth } from "better-auth";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "atom-development-auth-secret-32-chars",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:4000",
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || ""
    }
  }
});
