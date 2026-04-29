// Parsers for the three custom fenced blocks: ```fields, ```sig, ```grid.

import yaml from 'js-yaml';
import { fieldTable } from '../field-table.js';
import { signatureTable } from '../signature-table.js';
import { gridTable } from '../grid-table.js';
import { spacer } from '../blocks.js';

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
