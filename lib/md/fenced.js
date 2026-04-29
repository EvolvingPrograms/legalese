// Parsers for the custom fenced blocks: ```fields, ```sig, ```grid, ```grids.

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { Paragraph } from 'docx';
import { fieldTable } from '../field-table.js';
import { signatureTable } from '../signature-table.js';
import { gridTable } from '../grid-table.js';
import { spacer } from '../blocks.js';
import { b } from '../runs.js';

/** @typedef {{ baseDir: string }} ParseCtx */

/**
 * `Effective Date | effective_date | prefix=$ | sub=hint text`
 * @param {string} content
 * @param {Record<string, unknown>} values
 */
export function parseFieldsBlock(content, values) {
  const rows = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const parts = line.split('|').map(s => s.trim());
    const label = parts[0];
    const key = parts[1] || null;
    /** @type {{ prefix?: string, subLabel?: string }} */
    const opts = {};
    for (const extra of parts.slice(2)) {
      const m = extra.match(/^(\w+)=(.*)$/);
      if (!m) continue;
      if (m[1] === 'prefix') opts.prefix = m[2];
      else if (m[1] === 'sub') opts.subLabel = m[2];
    }
    return /** @type {[string, string | null, typeof opts]} */ ([label, key, opts]);
  });
  return fieldTable(values, rows);
}

/**
 * First line: `LEFT_HEADER || RIGHT_HEADER`. Each subsequent line:
 * `Label | key [tall]?  ||  Label | key [tall]?`. Empty side cell is fine.
 * @param {string} content
 * @param {Record<string, unknown>} values
 */
export function parseSigBlock(content, values) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return spacer();

  /** @param {string} sideText @returns {[string, string | null, { tall?: boolean }]} */
  const splitSide = (sideText) => {
    const parts = sideText.split('|').map(s => s.trim());
    if (parts.length === 0 || (parts.length === 1 && !parts[0])) return ['', null, {}];
    let label = parts[0];
    const key = parts[1] && parts[1] !== '_' ? parts[1] : null;
    /** @type {{ tall?: boolean }} */
    const opts = {};
    const tallMatch = label.match(/^(.*?)\s*\[tall\]\s*$/);
    if (tallMatch) { label = tallMatch[1]; opts.tall = true; }
    return [label, key, opts];
  };

  const [leftHeader, rightHeader] = lines[0].split('||').map(s => s.trim());
  /** @type {[string, string | null, { tall?: boolean }][]} */
  const leftRows = [];
  /** @type {[string, string | null, { tall?: boolean }][]} */
  const rightRows = [];
  for (const line of lines.slice(1)) {
    const [lside = '', rside = ''] = line.split('||');
    leftRows.push(splitSide(lside));
    rightRows.push(splitSide(rside));
  }
  return signatureTable(values, {
    left:  { header: leftHeader,  rows: leftRows },
    right: { header: rightHeader, rows: rightRows },
  });
}

/**
 * YAML body with `columns` and either `rows` or `empty_rows: N`.
 * @param {string} content
 */
export function parseGridBlock(content) {
  const cfg = /** @type {{ columns?: import('../grid-table.js').GridColumn[], rows?: import('../grid-table.js').GridRow[], empty_rows?: number }} */ (
    yaml.load(content) || {}
  );
  const columns = cfg.columns || [];
  let rows = cfg.rows || [];
  if (cfg.empty_rows && !cfg.rows) {
    rows = Array.from({ length: cfg.empty_rows }, () => ({}));
  }
  return gridTable({ columns, rows });
}

// Dot-path lookup: 'a.b.c' -> obj.a.b.c. Returns undefined for missing keys.
/** @param {unknown} obj @param {string} p */
function getPath(obj, p) {
  if (!p) return obj;
  return p.split('.').reduce(
    (acc, k) => (acc != null && typeof acc === 'object' ? /** @type {any} */ (acc)[k] : undefined),
    obj,
  );
}

// '{a.b}' interpolation against a context object. Missing keys render as ''.
/** @param {string} tpl @param {unknown} ctx */
function interpolate(tpl, ctx) {
  return tpl.replace(/\{([^}]+)\}/g, (_, expr) => {
    const v = getPath(ctx, expr.trim());
    return v == null ? '' : String(v);
  });
}

/**
 * Multi-grid block: emits N (heading paragraph + grid) pairs, all sharing one
 * `columns:` spec.
 *
 * Supported keys:
 *   columns:  GridColumn[] (required)
 *   from:     (string | object)[]  each entry is either a JSON file path
 *                                   (relative to the source markdown file) or
 *                                   an inline object with the same shape
 *   rows:     string                dot-path inside each loaded object to the
 *                                   row array (e.g. `tracks` or `data.items`).
 *                                   Omit to treat the loaded value as the rows.
 *   heading:  string | false        template interpolated against each loaded
 *                                   object (`{album.title}`); `false` to omit
 *
 * @param {string} content
 * @param {ParseCtx} ctx
 * @returns {(import('docx').Paragraph | import('docx').Table)[]}
 */
export function parseGridsBlock(content, ctx) {
  const cfg = /** @type {{
    columns?: import('../grid-table.js').GridColumn[],
    from?: (string | Record<string, unknown>)[],
    rows?: string,
    heading?: string | false,
  }} */ (yaml.load(content) || {});

  const columns = cfg.columns || [];
  const rowsPath = cfg.rows;
  const headingTpl = cfg.heading;

  /** @type {{ heading: string | null, rows: import('../grid-table.js').GridRow[] }[]} */
  const items = [];

  for (const source of cfg.from ?? []) {
    /** @type {unknown} */
    let data;
    if (typeof source === 'string') {
      const abs = path.isAbsolute(source) ? source : path.resolve(ctx.baseDir, source);
      data = JSON.parse(fs.readFileSync(abs, 'utf8'));
    } else {
      data = source;
    }
    const rowsAny = rowsPath ? getPath(data, rowsPath) : data;
    const rows = /** @type {import('../grid-table.js').GridRow[]} */ (
      Array.isArray(rowsAny) ? rowsAny : []
    );
    const heading = (headingTpl === false || headingTpl == null)
      ? null
      : interpolate(headingTpl, data);
    items.push({ heading, rows });
  }

  /** @type {(import('docx').Paragraph | import('docx').Table)[]} */
  const out = [];
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
