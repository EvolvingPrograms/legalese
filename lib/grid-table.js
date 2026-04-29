// gridTable({ columns, rows }) — generic data table with a shaded header row.

import { Table, TableRow, Paragraph, WidthType } from 'docx';
import { TABLE_WIDTH, TABLE_BORDERS } from './defaults.js';
import { b, t } from './runs.js';
import { cell } from './internal.js';

/**
 * @typedef {{ label: string, key: string, width: number }} GridColumn
 *   `key === '#'` renders 1-indexed row numbers. Widths are scaled to TABLE_WIDTH.
 * @typedef {Record<string, string | number | null | undefined>} GridRow
 */

/**
 * @param {{ columns: GridColumn[], rows: GridRow[] }} args
 */
export const gridTable = ({ columns, rows }) => {
  const totalW = columns.reduce((s, c) => s + c.width, 0);
  const factor = TABLE_WIDTH / totalW;
  const widths = columns.map((c) => Math.round(c.width * factor));
  // Absorb rounding into the last column.
  widths[widths.length - 1] =
    TABLE_WIDTH - widths.slice(0, -1).reduce((s, w) => s + w, 0);

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    borders: TABLE_BORDERS,
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: columns.map((col, idx) =>
          cell(
            [new Paragraph({ children: [b(col.label)] })],
            widths[idx],
            { header: true },
          ),
        ),
      }),
      ...rows.map((row, rowIdx) => new TableRow({
        cantSplit: true,
        children: columns.map((col, colIdx) => {
          let cellText = '';
          if (col.key === '#') cellText = String(rowIdx + 1);
          else if (row[col.key] != null) cellText = String(row[col.key]);
          return cell(
            [new Paragraph({ children: [t(cellText)] })],
            widths[colIdx],
          );
        }),
      })),
    ],
  });
};
