// Obsidian Vault → Core Engine importer (CLI).
//
//   npx tsx scripts/import-vault/index.ts --full         [--dry-run|--apply]
//   npx tsx scripts/import-vault/index.ts --project 25-14 [--dry-run|--apply]
//                                         [--vault <path>] [--report <file.json>]
//
// Dry run is the default and never touches the database. The Vault is opened
// strictly read-only in all modes.

import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "../../lib/db/schema";
import { applyPlan, buildFullPlan, buildPlan } from "./importer";
import type { Report } from "./types";

interface Args {
  vault: string;
  project?: string;
  full: boolean;
  apply: boolean;
  reportFile?: string;
}

function parseArgs(argv: string[]): Args {
  const a: Args = {
    vault: join(homedir(), "Documents", "Javier-Vault"),
    full: false,
    apply: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--vault") a.vault = argv[++i];
    else if (arg === "--project") a.project = argv[++i];
    else if (arg === "--full") a.full = true;
    else if (arg === "--apply") a.apply = true;
    else if (arg === "--dry-run") a.apply = false;
    else if (arg === "--report") a.reportFile = argv[++i];
  }
  if (!a.full && !a.project) {
    console.error("Specify --full or --project <name|number>");
    process.exit(2);
  }
  return a;
}

function printReport(r: Report, mode: string) {
  const L = (s = "") => console.log(s);
  const num = (k: string) => r.detected[k] ?? 0;
  L();
  L("═".repeat(70));
  L(`  VAULT IMPORT — ${mode.toUpperCase()}`);
  L("═".repeat(70));
  L(`  scope           ${r.scope}`);
  L(`  vault           ${r.vaultPath}`);
  L(`  files scanned   ${r.filesScanned}`);
  L();
  L("  DETECTED");
  L(`    projects                 ${num("projects")}`);
  L(`    communications           ${num("communications")}`);
  L(`    contacts                 ${num("contacts")}  (from consultant notes: ${num("contacts_from_notes")})`);
  L(`    tasks                    ${num("tasks")}`);
  L(`      review-required        ${r.reviewRequiredTasks}`);
  L(`      skipped (boilerplate)  ${r.tasksSkipped.length}`);
  L(`    meetings                 ${num("meetings")}`);
  L(`    knowledge notes          ${num("knowledge")}`);
  L(`    ideas                    ${num("ideas")}`);
  L(`    documents                ${num("documents")}`);
  L(`    relationships / links    ${r.relationships}`);
  if (Object.keys(r.imported).length) {
    L();
    L("  IMPORTED");
    for (const [k, v] of Object.entries(r.imported)) L(`    ${k.padEnd(24)} ${v}`);
  }
  L();
  L(`  unresolved project associations   ${r.unresolvedProjectAssociations.length}`);
  for (const u of r.unresolvedProjectAssociations.slice(0, 30)) L(`    ? ${u}`);
  if (r.unresolvedProjectAssociations.length > 30)
    L(`    … ${r.unresolvedProjectAssociations.length - 30} more`);
  L();
  L(`  duplicate detections              ${r.duplicates.length}`);
  for (const d of r.duplicates.slice(0, 15)) L(`    = ${d}`);
  L();
  L(`  warnings                          ${r.warnings.length}`);
  for (const w of r.warnings.slice(0, 40)) L(`    ! ${w}`);
  if (r.warnings.length > 40) L(`    … ${r.warnings.length - 40} more`);
  L();
  L(`  skipped task candidates           ${r.tasksSkipped.length}`);
  for (const s of r.tasksSkipped.slice(0, 40)) L(`    – (${s.reason}) ${s.text.slice(0, 66)}`);
  if (r.tasksSkipped.length > 40) L(`    … ${r.tasksSkipped.length - 40} more`);
  if (r.errors.length) {
    L();
    L(`  ERRORS (${r.errors.length})`);
    for (const e of r.errors) L(`    ✗ ${e}`);
  }
  L();
  L("═".repeat(70));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.apply ? "apply" : "dry-run";

  const plan = args.full
    ? buildFullPlan(args.vault)
    : buildPlan(args.vault, { projectQuery: args.project! });

  if (plan.report.errors.length && plan.report.filesScanned === 0) {
    printReport(plan.report, mode);
    process.exit(1);
  }

  let report = plan.report;
  if (args.apply) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error("--apply requires DATABASE_URL");
      process.exit(2);
    }
    const sql = postgres(url, { max: 1, onnotice: () => {} });
    const db = drizzle(sql, { schema });
    try {
      await migrate(db, { migrationsFolder: "./drizzle" });
      report = await applyPlan(plan, db);
    } catch (err) {
      report.errors.push(`apply failed: ${(err as Error).message}`);
      printReport(report, mode);
      await sql.end();
      process.exit(1);
    }
    await sql.end();
  }

  printReport(report, mode);

  if (args.reportFile) {
    writeFileSync(args.reportFile, JSON.stringify(report, null, 2));
    console.log(`  full report written → ${args.reportFile}`);
  }
  process.exit(report.errors.length ? 1 : 0);
}

main();
