import { DEFAULT_PLATFORMS } from "@shellf/shared";
import { db } from "./index";
import { platforms } from "./schema";

const existing = await db.select().from(platforms);
if (existing.length > 0) {
  console.log("Platforms already seeded, skipping.");
  process.exit(0);
}

await db.insert(platforms).values(
  DEFAULT_PLATFORMS.map((p) => ({
    name: p.name,
    shortName: p.shortName,
    emulatorCore: p.emulatorCore,
  })),
);

console.log(`Seeded ${DEFAULT_PLATFORMS.length} platforms.`);
