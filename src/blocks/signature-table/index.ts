/**
 * Renders a signature block table. Supports two layouts:
 *   - Single-sided (right is undefined): one header spanning two columns at full width.
 *   - Two-sided: two headers, four columns, sides padded to equal row count.
 */

import { Table, TableRow, Paragraph, AlignmentType, WidthType, HeightRule } from 'docx';

import { TABLE_WIDTH, TABLE_BORDERS, SIG_TALL } from '@/lib/defaults';
import { b, t } from '@/lib/runs';
import { cell, val } from '@/lib/internal';

import type { SigRow, SigSide } from './types';
export * from './types';

/** Normalise the sparse tuple form into a consistent object. */
const normRow = (row: SigRow) => {
  const [label = '', key = null, opts = {}] = row;
  return { label, key, opts };
};

export const signatureTable = (
  values: Record<string, unknown>,
  { left, right }: { left: SigSide; right?: SigSide },
) => {
  // --- Single-sided layout ---
  // One merged header cell, label column + value column at full table width.
  if (!right) {
    const LABEL_W = 3000;
    const VALUE_W = 6360;

    const rows = left.rows.map(normRow);

    return new Table({
      width: { size: TABLE_WIDTH, type: WidthType.DXA },
      columnWidths: [LABEL_W, VALUE_W],
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            cell(
              [new Paragraph({ alignment: AlignmentType.CENTER, children: [b(left.header)] })],
              LABEL_W + VALUE_W,
              { columnSpan: 2, header: true },
            ),
          ],
        }),
        ...rows.map((R) =>
          new TableRow({
            cantSplit: true,
            ...(R.opts.tall ? { height: { value: SIG_TALL, rule: HeightRule.ATLEAST } } : {}),
            children: [
              cell([new Paragraph({ children: [b(R.label)] })], LABEL_W, { header: true }),
              cell([new Paragraph({ children: [t(val(values, R.key))] })], VALUE_W),
            ],
          }),
        ),
      ],
    });
  }

  // --- Two-sided layout ---
  // Four columns: label | value | label | value. Both sides padded to equal length.
  const LABEL_W = 1500;
  const VALUE_W = 3180;

  const sigVal = (key: string | null) =>
    cell(
      [new Paragraph({ children: [t(val(values, key))] })],
      VALUE_W,
    );

  const maxRows = Math.max(left.rows.length, right.rows.length);
  const pad = (rows: SigRow[]) => {
    const out: SigRow[] = rows.slice();
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
            LABEL_W + VALUE_W,
            { columnSpan: 2, header: true },
          ),
          cell(
            [new Paragraph({ alignment: AlignmentType.CENTER, children: [b(right.header)] })],
            LABEL_W + VALUE_W,
            { columnSpan: 2, header: true },
          ),
        ],
      }),
      ...lrows.map((L, idx) => {
        const R = rrows[idx]!;
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
