// Block-level helpers — return Paragraph objects (or arrays of them).

import { Paragraph, AlignmentType, HeadingLevel } from 'docx';
import { t, asRun } from './runs.js';
import { PARA_SPACING, LIST_SPACING, SUBLIST_REF } from './defaults.js';

/** @typedef {import('docx').Paragraph} Para */
/** @typedef {import('./runs.js').RunChild} RunChild */
/** @typedef {RunChild | RunChild[]} ParaChild */

/**
 * Justified body paragraph, 12pt, 1.5 line spacing.
 * Children may be strings, TextRuns, or arrays of either (dt() returns an array).
 * @param {...ParaChild} children
 * @returns {Para}
 */
export const p = (...children) => new Paragraph({
  spacing: PARA_SPACING,
  alignment: AlignmentType.JUSTIFIED,
  children: children.flat().map(asRun),
});

/**
 * Centered uppercase title.
 * @param {string} text
 * @param {{ pageBreak?: boolean }} [opts]
 * @returns {Para}
 */
export const h1 = (text, opts = {}) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  pageBreakBefore: !!opts.pageBreak,
  children: [t(text)],
});

/**
 * Section heading (kept with next paragraph).
 * @param {string} text
 * @param {{ pageBreak?: boolean }} [opts]
 * @returns {Para}
 */
export const h2 = (text, opts = {}) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  pageBreakBefore: !!opts.pageBreak,
  children: [t(text)],
});

/**
 * Lowercase lettered sublist (a) (b) (c)...
 * Each item is a string or an array of children. Returns an array of Paragraphs;
 * build() flattens automatically.
 * @param {...ParaChild} items
 * @returns {Para[]}
 */
export const list = (...items) => items.map((item) => {
  const children = (Array.isArray(item) ? item : [item]).flat().map(asRun);
  return new Paragraph({
    numbering: { reference: SUBLIST_REF, level: 0 },
    spacing: LIST_SPACING,
    children,
  });
});

/** Blank line for vertical breathing room. @returns {Para} */
export const spacer = () => new Paragraph({
  spacing: { before: 80, after: 80 },
  children: [t('')],
});

/**
 * Escape hatch: pass through any docx Paragraph or Table you built yourself.
 * @template T
 * @param {T} node
 * @returns {T}
 */
export const raw = (node) => node;
