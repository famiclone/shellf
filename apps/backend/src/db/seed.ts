import { DEFAULT_GROUPS, DEFAULT_KINDS } from "@shellf/shared";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { groups, kinds } from "./schema";

/** Ensure the fixed kind set exists and is up to date. */
for (const k of DEFAULT_KINDS) {
  const [existing] = await db.select().from(kinds).where(eq(kinds.slug, k.slug)).limit(1);
  if (existing) {
    await db
      .update(kinds)
      .set({
        name: k.name,
        isSystem: k.isSystem,
        features: { ...k.features },
      })
      .where(eq(kinds.id, existing.id));
  } else {
    await db.insert(kinds).values({
      slug: k.slug,
      name: k.name,
      isSystem: k.isSystem,
      features: { ...k.features },
    });
  }
}
console.log(`Synced ${DEFAULT_KINDS.length} kinds.`);

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
