import { join } from "node:path";

const monorepoDataDir = join(import.meta.dir, "../../../../data");

export const DATA_DIR = process.env.DATA_DIR ?? monorepoDataDir;
export const DB_PATH =
  process.env.DATABASE_URL?.replace(/^file:/, "") ?? join(DATA_DIR, "shellf.db");
