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
 * Defined-term run: `(the *“Term”*)` by default, `(*“Term”*)` if `article: false`.
 * The article lives inside the parens so authors can write the noun naturally:
 *   "Exclusive Songwriter Agreement", dt('Agreement') → "… (the Agreement)".
 */
export const dt = (term: string, opts: { article?: boolean } = {}): TextRun[] => {
  const lead = opts.article === false ? '(' : '(the ';
  return [t(lead), bi(`“${term}”`), t(')')];
};

/** Coerce a bare string to a TextRun, passing an existing TextRun through unchanged. */
export const asRun = (child: RunChild): TextRun =>
  (typeof child === 'string' ? t(child) : child);
