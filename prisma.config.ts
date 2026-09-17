import path from "path";
import fs from "fs";
import dotenv from "dotenv";

const nodeEnv = process.env.NODE_ENV || "development";
const envFile = path.resolve(process.cwd(), `.env.${nodeEnv}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}
dotenv.config(); // fallback to standard .env

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
});

