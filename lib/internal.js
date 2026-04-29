// Shared internals for the table helpers. Not part of the public API.

import { TableCell, WidthType, VerticalAlign } from 'docx';
import { FULL_BORDERS, CELL_MARGINS, HEADER_SHADING } from './defaults.js';

/** @typedef {import('docx').Paragraph} Para */
/** @typedef {import('docx').TableCell} Cell */

/**
 * Build a TableCell with house-style borders, padding, and centered vertical alignment.
 * @param {Para[]} children
 * @param {number} width  DXA
 * @param {{ header?: boolean, columnSpan?: number }} [opts]
 * @returns {Cell}
 */
export const cell = (children, width, opts = {}) => new TableCell({
  borders: FULL_BORDERS,
  width: { size: width, type: WidthType.DXA },
  margins: CELL_MARGINS,
  verticalAlign: VerticalAlign.CENTER,
  children,
  ...(opts.header ? { shading: HEADER_SHADING } : {}),
  ...(opts.columnSpan ? { columnSpan: opts.columnSpan } : {}),
});

/**
 * Resolve a values lookup, returning '' when the key is absent or null.
 * @param {Record<string, unknown> | undefined | null} values
 * @param {string | null | undefined} key
 * @returns {string}
 */
export const val = (values, key) =>
  (key && values && values[key] != null) ? String(values[key]) : '';
