// Shared internals for the table helpers. Not part of the public API.

import { TableCell, WidthType, VerticalAlign } from 'docx';
import type { Paragraph } from 'docx';
import { FULL_BORDERS, CELL_MARGINS, HEADER_SHADING } from './defaults';

// Build a TableCell with house-style borders, padding, and centered vertical alignment.
export const cell = (
  children: Paragraph[],
  width: number,
  opts: { header?: boolean; columnSpan?: number } = {},
) => new TableCell({
  borders: FULL_BORDERS,
  width: { size: width, type: WidthType.DXA },
  margins: CELL_MARGINS,
  verticalAlign: VerticalAlign.CENTER,
  children,
  ...(opts.header ? { shading: HEADER_SHADING } : {}),
  ...(opts.columnSpan ? { columnSpan: opts.columnSpan } : {}),
});

// Resolve a values lookup, returning '' when the key is absent or null.
export const val = (
  values: Record<string, unknown> | undefined | null,
  key: string | null | undefined,
): string =>
  (key && values && values[key] != null) ? String(values[key]) : '';
