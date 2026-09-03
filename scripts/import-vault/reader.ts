// Vault reader — strictly read-only. Parses Markdown notes + frontmatter and
// extracts the structures the importer needs (checkboxes, wikilinks, sections).

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import matter from "gray-matter";

export interface Note {
  absPath: string;
  relPath: string; // relative to the vault root
  frontmatter: Record<string, unknown>;
  body: string;
  hash: string; // sha256 of the raw file
}

export function sha256(text: string | Buffer): string {
  return createHash("sha256").update(text).digest("hex");
}

export function parseNote(vaultRoot: string, absPath: string): Note {
  const rawBuf = readFileSync(absPath);
  // Normalize CRLF → LF; the Vault is edited on multiple platforms.
  const raw = rawBuf.toString("utf8").replace(/\r\n?/g, "\n");
  const parsed = matter(raw);
  return {
    absPath,
    relPath: relative(vaultRoot, absPath),
    frontmatter: (parsed.data ?? {}) as Record<string, unknown>,
    body: parsed.content ?? "",
    hash: sha256(rawBuf), // hash the original bytes for provenance
  };
}

/** All .md files under `dir` (recursive), skipping dotfolders. */
export function listMarkdown(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    let entries: string[];
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name.startsWith(".")) continue;
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (name.toLowerCase().endsWith(".md")) out.push(p);
    }
  };
  walk(dir);
  return out;
}

/** All files (any type) under `dir`, recursive, skipping dotfolders. */
export function listFiles(dir: string): { abs: string; size: number; mtime: Date }[] {
  const out: { abs: string; size: number; mtime: Date }[] = [];
  const walk = (d: string) => {
    let entries: string[];
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name.startsWith(".")) continue;
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else out.push({ abs: p, size: st.size, mtime: st.mtime });
    }
  };
  walk(dir);
  return out;
}

export interface Checkbox {
  text: string;
  checked: boolean;
  line: number; // 1-indexed within the file
}

/** Markdown checkboxes, optionally only within a `## <heading>` section. */
export function extractCheckboxes(body: string, section?: string): Checkbox[] {
  const lines = body.split("\n");
  const out: Checkbox[] = [];
  let inSection = section == null;
  const headingRe = /^#{1,6}\s+(.*)$/;
  const cbRe = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const h = line.match(headingRe);
    if (h) {
      if (section != null) {
        inSection = h[1].trim().toLowerCase() === section.toLowerCase();
      }
      continue;
    }
    if (!inSection) continue;
    const m = line.match(cbRe);
    if (m) {
      out.push({
        text: m[2].trim(),
        checked: m[1].toLowerCase() === "x",
        // +1 for the frontmatter/content split gray-matter already removed;
        // this is the line within the body, which is what we key on.
        line: i + 1,
      });
    }
  }
  return out;
}

/** `[[Target]]` / `[[Target|Alias]]` → ["Target", …] (targets, de-duped). */
export function extractWikilinks(text: string): string[] {
  const out = new Set<string>();
  const re = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.add(m[1].trim());
  return [...out];
}

/** Contents of a `## <heading>` section (until the next heading of same/higher level). */
export function section(body: string, heading: string): string {
  const lines = body.split("\n");
  const start = lines.findIndex(
    (l) => /^#{1,6}\s+/.test(l) && l.replace(/^#{1,6}\s+/, "").trim().toLowerCase() === heading.toLowerCase(),
  );
  if (start === -1) return "";
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^#{1,6}\s+/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join("\n").trim();
}

export function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export function strArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  const s = str(v);
  return s ? [s] : [];
}

export function bool(v: unknown): boolean {
  return v === true || v === "true" || v === "yes" || v === 1;
}

export function toDate(v: unknown): Date | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
