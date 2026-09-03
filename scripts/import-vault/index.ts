// Obsidian Vault → Core Engine importer (CLI).
//
//   npx tsx scripts/import-vault/index.ts --project "25-14" [--dry-run|--apply]
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
import { applyPlan, buildPlan, type Report } from "./importer";

interface Args {
  vault: string;
  project: string;
  apply: boolean;
  reportFile?: string;
}

function parseArgs(argv: string[]): Args {
  const a: Partial<Args> = {
    vault: join(homedir(), "Documents", "Javier-Vault"),
    apply: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--vault") a.vault = argv[++i];
    else if (arg === "--project") a.project = argv[++i];
    else if (arg === "--apply") a.apply = true;
    else if (arg === "--dry-run") a.apply = false;
    else if (arg === "--report") a.reportFile = argv[++i];
  }
  if (!a.project) {
    console.error('Missing --project "<name or number>"');
    process.exit(2);
  }
  return a as Args;
}

function printReport(r: Report, mode: string) {
  const line = (s = "") => console.log(s);
  line();
  line("═".repeat(64));
  line(`  VAULT IMPORT — ${mode.toUpperCase()}`);
  line("═".repeat(64));
  line(`  scope           ${r.scope}`);
  line(`  vault           ${r.vaultPath}`);
  line(`  files scanned   ${r.filesScanned}`);
  line();
  line("  entities detected");
  for (const [k, v] of Object.entries(r.detected)) line(`    ${k.padEnd(16)} ${v}`);
  if (Object.keys(r.imported).length) {
    line();
    line("  entities imported");
    for (const [k, v] of Object.entries(r.imported)) line(`    ${k.padEnd(16)} ${v}`);
  }
  line();
  line(`  relationships   ${r.relationships}`);
  line(`  tasks kept      ${r.tasksKept}`);
  line(`  tasks skipped   ${r.tasksSkipped.length}`);
  for (const s of r.tasksSkipped) line(`    – (${s.reason}) ${s.text.slice(0, 70)}`);
  if (r.warnings.length) {
    line();
    line(`  warnings (${r.warnings.length})`);
    for (const w of r.warnings) line(`    ! ${w}`);
  }
  if (r.unmatched.length) {
    line();
    line(`  unmatched files (${r.unmatched.length})`);
    for (const u of r.unmatched) line(`    ? ${u}`);
  }
  if (r.duplicates.length) {
    line();
    line(`  duplicates (${r.duplicates.length})`);
    for (const d of r.duplicates) line(`    = ${d}`);
  }
  if (r.errors.length) {
    line();
    line(`  ERRORS (${r.errors.length})`);
    for (const e of r.errors) line(`    ✗ ${e}`);
  }
  line();
  line("═".repeat(64));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.apply ? "apply" : "dry-run";

  const plan = buildPlan(args.vault, { projectQuery: args.project });

  if (plan.report.errors.length && plan.report.filesScanned === 0) {
    printReport(plan.report, mode);
    process.exit(1);
  }

  let report = plan.report;
  if (args.apply) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error("--apply requires DATABASE_URL (run with: npm run import:vault -- …)");
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
    console.log(`  report written → ${args.reportFile}`);
  }

  process.exit(report.errors.length ? 1 : 0);
}

main();
