// Block-level helpers — return Paragraph or Paragraph[] for use in build().

import { AlignmentType, HeadingLevel, Paragraph } from 'docx';

import { PARA_SPACING, LIST_SPACING, SUBLIST_REF } from '@/lib/defaults';
import { asRun, t } from '@/lib/runs';
import type { RunChild } from '@/lib/runs';

export type ParaChild = RunChild | RunChild[];

/** Justified body paragraph, 12pt, 1.5 line spacing.
 *  Children may be strings, TextRuns, or arrays of either (dt() returns an array). */
export const p = (...children: ParaChild[]) => new Paragraph({
  spacing: PARA_SPACING,
  alignment: AlignmentType.JUSTIFIED,
  children: children.flat().map(asRun),
});

/** Centered uppercase title. */
export const h1 = (text: string, opts: { pageBreak?: boolean } = {}) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  pageBreakBefore: !!opts.pageBreak,
  children: [t(text)],
});

/** Section heading, kept with the following paragraph. */
export const h2 = (text: string, opts: { pageBreak?: boolean } = {}) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  pageBreakBefore: !!opts.pageBreak,
  children: [t(text)],
});

// Each list() call gets its own numbering instance so the (a)(b)(c)… counter
// restarts per list — legal-doc convention. Without this, all paragraphs sharing
// SUBLIST_REF render as one continuous list.
let listInstanceCounter = 0;

/** Lowercase-lettered sublist — (a) (b) (c) …
 *  Each item is a string or an array of children. Returns an array of Paragraphs;
 *  build() flattens automatically. */
export const list = (...items: ParaChild[]) => {
  const instance = listInstanceCounter++;
  return items.map((item) => {
    const children = (Array.isArray(item) ? item : [item]).flat().map(asRun);
    return new Paragraph({
      numbering: { reference: SUBLIST_REF, level: 0, instance },
      spacing: LIST_SPACING,
      children,
    });
  });
};

/** Blank line for vertical breathing room. */
export const spacer = () => new Paragraph({
  spacing: { before: 80, after: 80 },
  children: [t('')],
});

/** Escape hatch: pass through any docx Paragraph or Table you built yourself. */
export const raw = <T>(node: T): T => node;
