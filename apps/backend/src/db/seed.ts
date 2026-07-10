import { DEFAULT_GROUPS, DEFAULT_KINDS } from "@shellf/shared";
import { db } from "./index";
import { groups, kinds } from "./schema";

const existingKinds = await db.select().from(kinds);
if (existingKinds.length === 0) {
  await db.insert(kinds).values(
    DEFAULT_KINDS.map((k) => ({
      slug: k.slug,
      name: k.name,
      isSystem: k.isSystem,
      features: { ...k.features },
    })),
  );
  console.log(`Seeded ${DEFAULT_KINDS.length} kinds.`);
} else {
  console.log("Kinds already seeded, skipping.");
}

const existingGroups = await db.select().from(groups);
if (existingGroups.length > 0) {
  console.log("Groups already seeded, skipping.");
  process.exit(0);
}

const allKinds = await db.select().from(kinds);
const kindBySlug = new Map(allKinds.map((k) => [k.slug, k.id]));

await db.insert(groups).values(
  DEFAULT_GROUPS.map((g) => ({
    name: g.name,
    slug: g.slug,
    emulatorCore: g.emulatorCore,
    kindId: kindBySlug.get(g.kindSlug) ?? null,
  })),
);

console.log(`Seeded ${DEFAULT_GROUPS.length} groups.`);
process.exit(0);
