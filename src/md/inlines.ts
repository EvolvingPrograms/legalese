// Pandoc inline AST -> docx TextRun[] conversion.
// Recognises {{Term}} markers and emits defined-term runs: ' (the *"Term"*)'.

import { TextRun } from 'docx';

import type { PandocInline } from './types';

type Run = TextRun;

// Only set bold/italic when true so heading-style bold isn't overridden.
function makeRun(text: string, bold: boolean, italic: boolean): Run {
  return new TextRun({
    text,
    ...(bold   ? { bold: true }    : {}),
    ...(italic ? { italics: true } : {}),
  });
}

// Scan plain text for {{Term}} markers, emitting defined-term runs.
function emitText(text: string, bold: boolean, italic: boolean, out: Run[]): void {
  const re = /\{\{([^}]+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push(makeRun(text.slice(last, m.index), bold, italic));
    }
    out.push(makeRun('(the ', bold, italic));
    out.push(makeRun(`“${m[1]!.trim()}”`, true, true));
    out.push(makeRun(')', bold, italic));
    last = m.index + m[0].length;
  }

  if (last < text.length) {
    out.push(makeRun(text.slice(last), bold, italic));
  }
}

// Flatten consecutive Str/Space/SoftBreak/LineBreak nodes into a single text
// string so {{Defined Term}} markers that pandoc split across tokens can be
// matched by emitText's regex.
function gatherText(inlines: PandocInline[], start: number): { text: string; end: number } {
  let text = '';
  let i = start;

  while (i < inlines.length) {
    const n = inlines[i]!;
    if      (n.t === 'Str')                                   text += n.c as string;
    else if (n.t === 'Space' || n.t === 'SoftBreak' || n.t === 'LineBreak') text += ' ';
    else break;
    i++;
  }

  return { text, end: i };
}

/** Convert a Pandoc inline node array into an array of docx TextRuns.
 *  Handles Strong, Emph, Quoted, Code, Span, and {{DefinedTerm}} markers. */
export function inlinesToRuns(
  inlines: PandocInline[],
  opts: { bold?: boolean; italic?: boolean } = {},
): Run[] {
  const { bold = false, italic = false } = opts;
  const out: Run[] = [];

  for (let i = 0; i < inlines.length; i++) {
    const node = inlines[i]!;

    switch (node.t) {
      case 'Str':
      case 'Space':
      case 'SoftBreak':
      case 'LineBreak': {
        const { text, end } = gatherText(inlines, i);
        emitText(text, bold, italic, out);
        i = end - 1;
        break;
      }

      case 'Strong':
        out.push(...inlinesToRuns(node.c as PandocInline[], { bold: true, italic }));
        break;

      case 'Emph':
        out.push(...inlinesToRuns(node.c as PandocInline[], { bold, italic: true }));
        break;

      case 'Underline':
        out.push(...inlinesToRuns(node.c as PandocInline[], { bold, italic: true }));
        break;

      case 'Strikeout':
        out.push(...inlinesToRuns(node.c as PandocInline[], opts));
        break;

      case 'Quoted': {
        const [quoteType, contents] = node.c as [{ t: string }, PandocInline[]];
        const open  = quoteType.t === 'DoubleQuote' ? '“' : '‘';
        const close = quoteType.t === 'DoubleQuote' ? '”' : '’';
        out.push(makeRun(open, bold, italic));
        out.push(...inlinesToRuns(contents, { bold, italic }));
        out.push(makeRun(close, bold, italic));
        break;
      }

      case 'Code': {
        const [, text] = node.c as [unknown, string];
        out.push(makeRun(text, bold, italic));
        break;
      }

      case 'Span': {
        const contents = (node.c as [unknown, PandocInline[]])[1];
        out.push(...inlinesToRuns(contents, opts));
        break;
      }

      // Note, Cite, Image, Link, RawInline, Math: ignored.
    }
  }

  return out;
}
