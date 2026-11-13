import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { db } from "./database";

export const auth = betterAuth({
  database: {
    db,
    type: "sqlite",
  },
  baseURL: "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
  },
  plugins: [username()],
});
