/**
 * Inline run helpers — return TextRun objects for use inside p().
 * Each helper is intentionally minimal: one property per function.
 */

import { TextRun } from 'docx';

export type RunChild = string | TextRun;

/** Plain text run. */
export const t  = (text: string) => new TextRun({ text });

/** Bold run. */
export const b  = (text: string) => new TextRun({ text, bold: true });

/** Italic run. */
export const i  = (text: string) => new TextRun({ text, italics: true });

/** Bold-italic run. */
export const bi = (text: string) => new TextRun({ text, bold: true, italics: true });

/**
 * Defined-term run.
 *   dt('Agreement')                 → ' (the *“Agreement”*)'  (common noun, default)
 *   dt('Claude', { proper: true })  → ' (*“Claude”*)'          (proper noun, no article)
 * Leading space is always included so the run reads naturally after a noun.
 */
export const dt = (term: string, opts: { proper?: boolean } = {}): TextRun[] => [
  t(opts.proper ? ' (' : ' (the '),
  bi(`“${term}”`),
  t(')'),
];

/** Coerce a bare string to a TextRun, passing an existing TextRun through unchanged. */
export const asRun = (child: RunChild): TextRun =>
  (typeof child === 'string' ? t(child) : child);
