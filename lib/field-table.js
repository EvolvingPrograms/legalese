// fieldTable(values, rows) — two-column "Label | Value" table with full grid borders.

import { Table, TableRow, Paragraph, TextRun, WidthType } from 'docx';
import { TABLE_WIDTH, TABLE_BORDERS } from './defaults.js';
import { b, t } from './runs.js';
import { cell, val } from './internal.js';

/**
 * @typedef {[label: string, key: string | null, opts?: { prefix?: string, subLabel?: string }]} FieldRowTuple
 * @typedef {{ label: string, key: string | null, prefix?: string, subLabel?: string }} FieldRowObject
 * @typedef {FieldRowTuple | FieldRowObject} FieldRow
 */

/**
 * Two-column field table. Each row may be a tuple `['Label', 'key']` (with an
 * optional `{ prefix, subLabel }` opts object as the third element), or an
 * object `{ label, key, prefix?, subLabel? }`.
 * @param {Record<string, unknown>} values
 * @param {FieldRow[]} rows
 */
export const fieldTable = (values, rows) => {
  const LABEL_W = 2800;
  const VALUE_W = TABLE_WIDTH - LABEL_W;

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [LABEL_W, VALUE_W],
    borders: TABLE_BORDERS,
    rows: rows.map((row) => {
      let label, key, prefix, subLabel;
      if (Array.isArray(row)) {
        [label, key] = row;
        const opts = row[2] || {};
        prefix = opts.prefix; subLabel = opts.subLabel;
      } else {
        ({ label, key, prefix, subLabel } = row);
      }
      const cellText = (prefix || '') + val(values, key);
      const labelChildren = [
        new Paragraph({ children: [b(label)] }),
        ...(subLabel ? [new Paragraph({
          spacing: { before: 40 },
          children: [new TextRun({ text: subLabel, italics: true, size: 20 })],
        })] : []),
      ];
      return new TableRow({
        cantSplit: true,
        children: [
          cell(labelChildren, LABEL_W, { header: true }),
          cell([new Paragraph({ children: [t(cellText)] })], VALUE_W),
        ],
      });
    }),
  });
};
