import { defineConfig } from "drizzle-kit";

import { join } from "node:path";
import { DATA_DIR } from "./src/lib/config";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: join(DATA_DIR, "shellf.db"),
  },
});
