// Pandoc inline AST -> docx TextRun[] conversion.
// Recognises {{Term}} markers and emits defined-term runs: ' (the *"Term"*)'.

import { TextRun } from 'docx';

/** @typedef {import('./pandoc.js').PandocInline} PandocInline */
/** @typedef {import('docx').TextRun} Run */

// Only set bold/italic when true so heading-style bold isn't overridden.
/**
 * @param {string} text @param {boolean} bold @param {boolean} italic
 * @returns {Run}
 */
function makeRun(text, bold, italic) {
  return new TextRun({
    text,
    ...(bold ? { bold: true } : {}),
    ...(italic ? { italics: true } : {}),
  });
}

/**
 * Scan plain text for {{Term}} markers, emitting defined-term runs.
 * @param {string} text @param {boolean} bold @param {boolean} italic @param {Run[]} out
 */
function emitText(text, bold, italic, out) {
  const re = /\{\{([^}]+)\}\}/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push(makeRun(text.slice(last, m.index), bold, italic));
    }
    out.push(makeRun('(the ', bold, italic));
    out.push(makeRun(`“${m[1].trim()}”`, true, true));
    out.push(makeRun(')', bold, italic));
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push(makeRun(text.slice(last), bold, italic));
  }
}

/**
 * @param {PandocInline[]} inlines
 * @param {{ bold?: boolean, italic?: boolean }} [opts]
 * @returns {Run[]}
 */
export function inlinesToRuns(inlines, opts = {}) {
  const { bold = false, italic = false } = opts;
  /** @type {Run[]} */
  const out = [];
  for (const node of inlines) {
    switch (node.t) {
      case 'Str':
        emitText(node.c, bold, italic, out);
        break;
      case 'Space':
      case 'SoftBreak':
      case 'LineBreak':
        out.push(makeRun(' ', bold, italic));
        break;
      case 'Strong':
        out.push(...inlinesToRuns(node.c, { bold: true, italic }));
        break;
      case 'Emph':
        out.push(...inlinesToRuns(node.c, { bold, italic: true }));
        break;
      case 'Underline':
        out.push(...inlinesToRuns(node.c, { bold, italic: true }));
        break;
      case 'Strikeout':
        out.push(...inlinesToRuns(node.c, opts));
        break;
      case 'Quoted': {
        const [quoteType, contents] = node.c;
        const open = quoteType.t === 'DoubleQuote' ? '“' : '‘';
        const close = quoteType.t === 'DoubleQuote' ? '”' : '’';
        out.push(makeRun(open, bold, italic));
        out.push(...inlinesToRuns(contents, { bold, italic }));
        out.push(makeRun(close, bold, italic));
        break;
      }
      case 'Code': {
        const [, text] = node.c;
        out.push(makeRun(text, bold, italic));
        break;
      }
      case 'Span': {
        const contents = node.c[1];
        out.push(...inlinesToRuns(contents, opts));
        break;
      }
      // Note, Cite, Image, Link, RawInline, Math: ignored.
    }
  }
  return out;
}
