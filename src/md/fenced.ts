// Parsers for the custom fenced blocks: ```fields, ```sig, ```grid, ```grids.

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { Paragraph } from 'docx';
import type { Table } from 'docx';
import { fieldTable } from '@/blocks/field-table';
import { signatureTable } from '@/blocks/signature-table';
import { gridTable } from '@/blocks/grid-table';
import { spacer } from '@/blocks';
import { b } from '@/lib/runs';
import type { FieldRow } from '@/blocks/field-table/types';
import type { GridColumn, GridRow } from '@/blocks/grid-table/types';
import type { SigRow } from '@/blocks/signature-table/types';
import type { ParseCtx } from './types';

// `Effective Date | effective_date | prefix=$ | sub=hint text`
export function parseFieldsBlock(content: string, values: Record<string, unknown>) {
  const rows: FieldRow[] = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const parts = line.split('|').map(s => s.trim());
    const label = parts[0]!;
    const key = parts[1] || null;
    const opts: { prefix?: string; subLabel?: string } = {};
    for (const extra of parts.slice(2)) {
      const m = extra.match(/^(\w+)=(.*)$/);
      if (!m) continue;
      if (m[1] === 'prefix') opts.prefix = m[2];
      else if (m[1] === 'sub') opts.subLabel = m[2];
    }
    return [label, key, opts] as FieldRow;
  });
  return fieldTable(values, rows);
}

// Two-sided: first line `LEFT_HEADER || RIGHT_HEADER`, each subsequent line
// `Label | key [tall]?  ||  Label | key [tall]?`.
// Single-sided: omit `||` (or leave the right side fully blank) to render a
// 2-column full-width signature table with a single merged header.
export function parseSigBlock(content: string, values: Record<string, unknown>) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return spacer();

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
    return signatureTable(values, {
      left: { header: leftHeader, rows: leftRows },
    });
  }

  return signatureTable(values, {
    left:  { header: leftHeader,  rows: leftRows },
    right: { header: rightHeader, rows: rightRows },
  });
}

// YAML body with `columns` and either `rows` or `empty_rows: N`.
export function parseGridBlock(content: string) {
  const cfg = (yaml.load(content) || {}) as {
    columns?: GridColumn[];
    rows?: GridRow[];
    empty_rows?: number;
  };
  const columns = cfg.columns || [];
  let rows = cfg.rows || [];
  if (cfg.empty_rows && !cfg.rows) {
    rows = Array.from({ length: cfg.empty_rows }, () => ({}));
  }
  return gridTable({ columns, rows });
}

// Dot-path lookup: 'a.b.c' -> obj.a.b.c. Returns undefined for missing keys.
function getPath(obj: unknown, p: string): unknown {
  if (!p) return obj;
  return p.split('.').reduce<unknown>(
    (acc, k) => (acc != null && typeof acc === 'object' ? (acc as any)[k] : undefined),
    obj,
  );
}

// '{a.b}' interpolation against a context object. Missing keys render as ''.
function interpolate(tpl: string, ctx: unknown): string {
  return tpl.replace(/\{([^}]+)\}/g, (_, expr) => {
    const v = getPath(ctx, expr.trim());
    return v == null ? '' : String(v);
  });
}

// Multi-grid block: emits N (heading paragraph + grid) pairs, all sharing one
// `columns:` spec.
//
// Supported keys:
//   columns:  GridColumn[] (required)
//   from:     (string | object)[]  each entry is either a JSON file path
//                                   (relative to the source markdown file) or
//                                   an inline object with the same shape
//   rows:     string                dot-path inside each loaded object to the
//                                   row array (e.g. `tracks` or `data.items`).
//                                   Omit to treat the loaded value as the rows.
//   heading:  string | false        template interpolated against each loaded
//                                   object (`{album.title}`); `false` to omit
export function parseGridsBlock(content: string, ctx: ParseCtx): (Paragraph | Table)[] {
  const cfg = (yaml.load(content) || {}) as {
    columns?: GridColumn[];
    from?: (string | Record<string, unknown>)[];
    rows?: string;
    heading?: string | false;
  };

  const columns = cfg.columns || [];
  const rowsPath = cfg.rows;
  const headingTpl = cfg.heading;

  const items: { heading: string | null; rows: GridRow[] }[] = [];

  for (const source of cfg.from ?? []) {
    let data: unknown;
    if (typeof source === 'string') {
      const abs = path.isAbsolute(source) ? source : path.resolve(ctx.baseDir, source);
      data = JSON.parse(fs.readFileSync(abs, 'utf8'));
    } else {
      data = source;
    }
    const rowsAny = rowsPath ? getPath(data, rowsPath) : data;
    const rows = (Array.isArray(rowsAny) ? rowsAny : []) as GridRow[];
    const heading = (headingTpl === false || headingTpl == null)
      ? null
      : interpolate(headingTpl, data);
    items.push({ heading, rows });
  }

  const out: (Paragraph | Table)[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    if (item.heading) {
      out.push(new Paragraph({
        spacing: { before: 200, after: 80 },
        keepNext: true,
        children: [b(item.heading)],
      }));
    }
    out.push(gridTable({ columns, rows: item.rows }));
    if (i < items.length - 1) out.push(spacer());
  }
  return out;
}
