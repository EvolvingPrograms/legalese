// Parsers for the custom fenced blocks: ```fields, ```sig, ```grid.

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

import { Paragraph } from 'docx';
import type { Table } from 'docx';

import type { FieldRow, GridColumn, GridRow, SigRow } from '@/blocks';
import { fieldTable, signatureTable, gridTable, spacer } from '@/blocks';
import { b } from '@/lib/runs';

import { fieldLabel } from './values';
import type { ParseCtx, Schema } from './types';

// Field rows accept two shapes:
//   key                                       — bare key; label resolved from
//                                               schema.description / schema.term / derived
//   Label | key | prefix=$ | sub=hint text    — explicit label + optional opts
export function parseFieldsBlock(
  content: string,
  values: Record<string, unknown>,
  schema?: Schema,
) {
  const rows: FieldRow[] = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map((line) => {
    const parts = line.split('|').map(s => s.trim());

    // Bare key: single token, no pipes, looks like a snake_case identifier.
    if (parts.length === 1 && /^[a-z][a-z0-9_]*$/.test(parts[0]!)) {
      const key = parts[0]!;
      return [fieldLabel(key, schema), key, {}] as FieldRow;
    }

    const label = parts[0]!;
    const key = parts[1] || null;
    const opts: { prefix?: string; subLabel?: string } = {};
    for (const extra of parts.slice(2)) {
      const m = extra.match(/^(\w+)=(.*)$/);
      if (!m) continue;
      if      (m[1] === 'prefix') opts.prefix   = m[2];
      else if (m[1] === 'sub')    opts.subLabel = m[2];
    }
    return [label, key, opts] as FieldRow;
  });
  return fieldTable(values, rows);
}

// Two-sided: first line `LEFT_HEADER || RIGHT_HEADER`, each subsequent line
// `Label | key [tall]?  ||  Label | key [tall]?`.
// Single-sided: omit `||` (or leave the right side fully blank).
// Repeated: first line `from: $key` followed by single-sided template; emits
// one stacked sig table per entry in `values[key]`. Each entry is an object;
// row keys resolve against the entry, not against global values. Useful for
// multi-director board resolutions, multi-party releases, etc.
export function parseSigBlock(
  content: string,
  values: Record<string, unknown>,
): (Paragraph | Table)[] {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [spacer()];

  const splitSide = (sideText: string): SigRow => {
    const parts = sideText.split('|').map(s => s.trim());
    if (parts.length === 0 || (parts.length === 1 && !parts[0])) return ['', null, {}];
    let label = parts[0]!;
    const key = parts[1] && parts[1] !== '_' ? parts[1] : null;
    const opts: { tall?: boolean } = {};
    const tallMatch = label.match(/^(.*?)\s*\[tall\]\s*$/);
    if (tallMatch) { label = tallMatch[1]!; opts.tall = true; }
    return [label, key, opts];
  };

  // Repeater: `from: $key` on first line, single-sided template after.
  const fromMatch = lines[0]!.match(/^from:\s*\$([a-z_][a-z0-9_]*)\s*$/i);
  if (fromMatch) {
    const key = fromMatch[1]!;
    const entries = values[key];
    if (!Array.isArray(entries)) {
      if (entries !== undefined) {
        console.warn(`sig: from $${key} expected array in values, got:`, entries);
      }
      return [spacer()];
    }
    const header = lines[1] ?? '';
    const templateRows = lines.slice(2).map(splitSide);
    const out: (Paragraph | Table)[] = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i] as Record<string, unknown>;
      out.push(signatureTable(entry, {
        left: { header, rows: templateRows },
      }));
      if (i < entries.length - 1) out.push(spacer());
    }
    return out;
  }

  const [leftHeader = '', rightHeader = ''] = lines[0]!.split('||').map(s => s.trim());
  const leftRows: SigRow[] = [];
  const rightRows: SigRow[] = [];
  for (const line of lines.slice(1)) {
    const [lside = '', rside = ''] = line.split('||');
    leftRows.push(splitSide(lside));
    rightRows.push(splitSide(rside));
  }

  const rightEmpty = !rightHeader && rightRows.every(([label, key]) => !label && !key);
  if (rightEmpty) {
    return [signatureTable(values, {
      left: { header: leftHeader, rows: leftRows },
    })];
  }

  return [signatureTable(values, {
    left:  { header: leftHeader,  rows: leftRows },
    right: { header: rightHeader, rows: rightRows },
  })];
}

// `grid` block — YAML body with `columns:` (required) plus one of:
//
//   rows: [ ... ]      — single table; rows are objects keyed by column.
//   rows: $key         — single table; rows pulled from values[key] (flat array).
//   empty_rows: N      — single table with N blank rows (for hand-fill at signing).
//   from: [ ... ]      — repeater; emit one (optional heading + table) per entry.
//                        Each entry is `{ heading?: string, rows: [...] }`,
//                        either inline or a YAML file path with the same shape.
//   from: $key         — repeater; entries pulled from values[key].
//
// Path resolution for `from:` entries that are file paths:
//   - Literal array in template → relative to the .md file's directory.
//   - `$key` from values        → relative to process.cwd() (CLI ergonomics:
//                                  `cd /work && md-to-docx tpl.md ...`).

/** Resolve `$key` references against the values map. Returns the array, or
 *  null on missing/wrong-type (with a warning for misconfiguration). */
function resolveDollarKey<T>(
  raw: unknown,
  values: Record<string, unknown> | undefined,
  context: string,
): T[] | null {
  if (typeof raw !== 'string' || !raw.trim().startsWith('$')) return null;
  const key = raw.trim().slice(1);
  const v = values?.[key];
  if (Array.isArray(v)) return v as T[];
  if (v !== undefined) {
    console.warn(`grid: ${context} $${key} expected array in values, got:`, v);
  }
  return [];
}

export function parseGridBlock(
  content: string,
  ctx: ParseCtx,
  values?: Record<string, unknown>,
): (Paragraph | Table)[] {
  const cfg = (yaml.load(content) || {}) as {
    columns?: GridColumn[];
    rows?: GridRow[] | string;
    empty_rows?: number;
    from?: string | (string | { heading?: string; rows?: GridRow[] })[];
  };

  const columns = cfg.columns || [];

  // Repeater mode — `from:` set.
  if (cfg.from !== undefined) {
    const dollar = resolveDollarKey<string | { heading?: string; rows?: GridRow[] }>(
      cfg.from, values, 'from',
    );
    const fromList = dollar ?? ((cfg.from ?? []) as (string | { heading?: string; rows?: GridRow[] })[]);
    const pathBase = dollar ? process.cwd() : ctx.baseDir;

    const out: (Paragraph | Table)[] = [];
    for (let i = 0; i < fromList.length; i++) {
      const source = fromList[i]!;
      let entry: { heading?: string; rows?: GridRow[] };
      if (typeof source === 'string') {
        const abs = path.isAbsolute(source) ? source : path.resolve(pathBase, source);
        entry = (yaml.load(fs.readFileSync(abs, 'utf8')) || {}) as typeof entry;
      } else {
        entry = source;
      }
      if (entry.heading) {
        out.push(new Paragraph({
          spacing: { before: 200, after: 80 },
          keepNext: true,
          children: [b(entry.heading)],
        }));
      }
      out.push(gridTable({ columns, rows: entry.rows ?? [] }));
      if (i < fromList.length - 1) out.push(spacer());
    }
    return out;
  }

  // Single-table mode. `rows:` may be a literal array or a `$key` reference
  // pulling a flat row array out of values.
  const dollarRows = resolveDollarKey<GridRow>(cfg.rows, values, 'rows');
  let rows: GridRow[] = dollarRows ?? (Array.isArray(cfg.rows) ? cfg.rows : []);
  if (cfg.empty_rows && rows.length === 0) {
    rows = Array.from({ length: cfg.empty_rows }, () => ({}));
  }
  return [gridTable({ columns, rows })];
}
