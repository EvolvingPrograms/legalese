// signatureTable(values, { left, right }) — four-column block with merged
// header cells per side. Two sides auto-pad to equal length.

import { Table, TableRow, Paragraph, AlignmentType, WidthType, HeightRule } from 'docx';
import { TABLE_WIDTH, TABLE_BORDERS, SIG_TALL } from './defaults.js';
import { b, t } from './runs.js';
import { cell, val } from './internal.js';

/**
 * @typedef {[label: string, key: string | null, opts?: { tall?: boolean }]} SigRow
 * @typedef {{ header: string, rows: SigRow[] }} SigSide
 */

/**
 * @param {Record<string, unknown>} values
 * @param {{ left: SigSide, right: SigSide }} sides
 */
export const signatureTable = (values, { left, right }) => {
  const LABEL_W = 1500;
  const VALUE_W = 3180;

  /** @param {string | null} key */
  const sigVal = (key) => cell(
    [new Paragraph({ children: [t(val(values, key))] })],
    VALUE_W,
  );

  /** @param {SigRow} row */
  const normRow = (row) => {
    const [label = '', key = null, opts = {}] = row;
    return { label, key, opts };
  };

  const maxRows = Math.max(left.rows.length, right.rows.length);
  /** @param {SigRow[]} rows */
  const pad = (rows) => {
    /** @type {SigRow[]} */
    const out = rows.slice();
    while (out.length < maxRows) out.push(['', null]);
    return out.map(normRow);
  };
  const lrows = pad(left.rows);
  const rrows = pad(right.rows);

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [LABEL_W, VALUE_W, LABEL_W, VALUE_W],
    borders: TABLE_BORDERS,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          cell(
            [new Paragraph({ alignment: AlignmentType.CENTER, children: [b(left.header)] })],
            LABEL_W + VALUE_W, { columnSpan: 2, header: true },
          ),
          cell(
            [new Paragraph({ alignment: AlignmentType.CENTER, children: [b(right.header)] })],
            LABEL_W + VALUE_W, { columnSpan: 2, header: true },
          ),
        ],
      }),
      ...lrows.map((L, idx) => {
        const R = rrows[idx];
        const tall = L.opts.tall || R.opts.tall;
        return new TableRow({
          cantSplit: true,
          ...(tall ? { height: { value: SIG_TALL, rule: HeightRule.ATLEAST } } : {}),
          children: [
            cell([new Paragraph({ children: [b(L.label)] })], LABEL_W, { header: true }),
            sigVal(L.key),
            cell([new Paragraph({ children: [b(R.label)] })], LABEL_W, { header: true }),
            sigVal(R.key),
          ],
        });
      }),
    ],
  });
};
