import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../packages/database/generated/prisma/client";
import { createMigrationClient } from "./legacy-catalog/client";
import { classifyImageSource, loadImageBytes } from "./legacy-catalog/images";
import { loadLegacyCatalog } from "./legacy-catalog/load";
import type { ImageReport, MigrationReport, PhaseCounts } from "./legacy-catalog/types";

const PHASE_ORDER = [
  "categories",
  "brands",
  "attributes",
  "products",
  "variants",
  "images",
  "prices",
  "inventory",
] as const;

function parseArgs(argv: string[]) {
  return {
    dryRun: !argv.includes("--apply"),
    apply: argv.includes("--apply"),
    imagesOnly: argv.includes("--images-only"),
    forceImages: argv.includes("--force-images"),
  };
}

function printReport(report: MigrationReport) {
  console.log(report.dryRun ? "DRY RUN — nothing written to Odoo." : "APPLY — writing through Odoo ORM.");
  console.log("");
  console.log(`Categories: ${report.counts.categories}`);
  console.log(`Brands: ${report.counts.brands}`);
  console.log(`Products: ${report.counts.products}`);
  console.log(`Variants: ${report.counts.variants}`);
  console.log(`Attributes: ${report.counts.attributes}`);
  console.log(`Attribute values: ${report.counts.attributeValues}`);
  console.log(`Prices: ${report.counts.prices}`);
  console.log(`Inventory rows: ${report.counts.inventoryRows}`);
  console.log(`Primary images: ${report.counts.images}`);
  console.log(`Gallery images (not in storefront): ${report.counts.galleryImages}`);
  if (report.images) {
    console.log("");
    console.log("Image migration:");
    console.log(`- primary written: ${report.images.primaryMigrated}`);
    console.log(`- already had image: ${report.images.alreadyHadImage}`);
    console.log(`- missing source: ${report.images.missingSource}`);
    console.log(`- broken source path/URL: ${report.images.brokenSource}`);
    console.log(`- download/read failures: ${report.images.downloadFailed}`);
    console.log(`- gallery-only (no primary bytes): ${report.images.galleryOnly}`);
    console.log(`- remote URLs: ${report.images.remoteUrls}`);
    console.log(`- local files: ${report.images.localFiles}`);
  }
  console.log("");
  console.log("Inventory:");
  console.log(`- on-hand: ${report.inventory.onHand}`);
  console.log(`- reserved (NOT migrated): ${report.inventory.reserved}`);
  console.log(`- available: ${report.inventory.available}`);
  console.log("");
  console.log("Price groups:");
  for (const group of report.priceGroups) {
    console.log(`- ${group.name} (${group.slug}, ${group.status}): ${group.priceCount} prices`);
  }
  const warnings = report.issues.filter((issue) => issue.severity === "warning");
  const errors = report.issues.filter((issue) => issue.severity === "error");
  if (warnings.length) {
    console.log("");
    console.log("Warnings:");
    for (const issue of warnings) console.log(`- ${issue.code}: ${issue.message}`);
  }
  if (errors.length) {
    console.log("");
    console.log("Errors:");
    for (const issue of errors) console.log(`- ${issue.code}: ${issue.message}`);
  }
  if (report.phases) {
    console.log("");
    console.log("Odoo write results:");
    for (const [phase, counts] of Object.entries(report.phases)) {
      console.log(`- ${phase}: created ${counts.created}, updated ${counts.updated}, skipped ${counts.skipped}, errors ${counts.errors}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const loaded = await loadLegacyCatalog(prisma);
    const imageStats: ImageReport = {
      primaryMigrated: 0,
      alreadyHadImage: 0,
      missingSource: 0,
      brokenSource: 0,
      downloadFailed: 0,
      galleryOnly: 0,
      localFiles: 0,
      remoteUrls: 0,
    };
    for (const job of loaded.imageJobs) {
      const kind = classifyImageSource(job.primary);
      if (kind === "missing") imageStats.missingSource += 1;
      else if (kind === "url") imageStats.remoteUrls += 1;
      else if (kind === "file") imageStats.localFiles += 1;
      else imageStats.brokenSource += 1;
    }
    const report: MigrationReport = {
      dryRun: !args.apply,
      counts: loaded.counts,
      issues: loaded.issues,
      inventory: loaded.inventorySummary,
      priceGroups: loaded.priceGroups,
      images: imageStats,
    };

    if (!args.apply) {
      printReport(report);
      const fatal = loaded.issues.some((issue) => issue.severity === "error");
      process.exitCode = fatal ? 1 : 0;
      return;
    }

    const fatal = loaded.issues.filter((issue) => issue.severity === "error");
    if (fatal.length) {
      printReport(report);
      throw new Error("Refusing to apply: resolve catalog errors first.");
    }

    const baseUrl = process.env.ODOO_API_URL ?? "http://localhost:8070";
    const token = process.env.ALMOHIT_MIGRATION_TOKEN ?? process.env.ODOO_MIGRATION_PASSWORD;
    if (!token) throw new Error("ALMOHIT_MIGRATION_TOKEN or ODOO_MIGRATION_PASSWORD is required");
    const client = createMigrationClient({ baseUrl, token });
    const ping = await client.ping();
    if (!ping.wholesale_pricelist_id) {
      throw new Error("Almohit Wholesale pricelist is missing in Odoo.");
    }

    const phases: Record<string, PhaseCounts> = {};
    const run = async (phase: (typeof PHASE_ORDER)[number], records: unknown[], size = 25) => {
      let created = 0;
      let updated = 0;
      let skipped = 0;
      let errors = 0;
      for (let index = 0; index < records.length; index += size) {
        const chunk = records.slice(index, index + size);
        const result = await client.batch(phase, chunk);
        created += result.created;
        updated += result.updated;
        skipped += result.skipped;
        errors += result.errors;
        for (const row of result.results) {
          if (row.reason === "ALREADY_HAS_IMAGE") continue;
          if (row.action === "error" || row.reason) {
            report.issues.push({
              severity: row.action === "error" ? "error" : "warning",
              code: row.reason || row.action,
              message: `${phase} ${row.xmlid}: ${row.reason || row.action}`,
            });
          }
          for (const warning of row.warnings ?? []) {
            report.issues.push({ severity: "warning", code: "VARIANT_WARNING", message: warning });
          }
        }
      }
      phases[phase] = { created, updated, skipped, errors };
    };

    if (!args.imagesOnly) {
      await run("categories", loaded.categories);
      await run("brands", loaded.brands);
      await run("attributes", loaded.attributes);
      await run("products", loaded.products);
      await run("variants", loaded.variantConfigs);
    }

    const imageRecords: unknown[] = [];
    const queue = [...loaded.imageJobs];
    const workers = 5;
    async function takeJob() {
      while (queue.length) {
        const job = queue.shift();
        if (!job) return;
        const record: Record<string, unknown> = {
          legacy_id: job.productId,
          force: args.forceImages,
        };
        if (job.primary) {
          const image = await loadImageBytes(job.primary);
          if (image) record.image_base64 = image.data;
          else {
            imageStats.downloadFailed += 1;
            const kind = classifyImageSource(job.primary);
            const code = kind === "file" ? "IMAGE_FILE_FAILED" : "IMAGE_FETCH_FAILED";
            report.issues.push({
              severity: "warning",
              code,
              message: `Could not read primary image for ${job.productId} (${kind})`,
              legacyId: job.productId,
            });
          }
        }
        const gallery: Array<{ name: string; data: string; mimetype: string }> = [];
        for (const extra of job.gallery) {
          const image = await loadImageBytes(extra.url);
          if (image) gallery.push({ name: extra.name, data: image.data, mimetype: image.mimetype });
        }
        if (gallery.length) record.gallery = gallery;
        if (!record.image_base64 && gallery.length) imageStats.galleryOnly += 1;
        if (record.image_base64 || gallery.length) imageRecords.push(record);
      }
    }
    await Promise.all(Array.from({ length: workers }, () => takeJob()));
    await run("images", imageRecords, 5);
    const imagePhase = phases.images;
    if (imagePhase) {
      imageStats.primaryMigrated = imagePhase.updated;
      imageStats.alreadyHadImage = imagePhase.skipped;
    }
    if (!args.imagesOnly) {
      await run("prices", loaded.prices);
      await run("inventory", loaded.inventory);
    }

    report.phases = phases;
    printReport(report);
    const writeErrors = Object.values(phases).reduce((sum, row) => sum + row.errors, 0);
    process.exitCode = writeErrors ? 1 : 0;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
