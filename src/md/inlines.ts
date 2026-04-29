// Pandoc inline AST -> docx TextRun[] conversion.
//
// Marker forms (curly quotes always; bold-italic for the term):
//
//   {{Term}}       → (the *“Term”*)        — define inline (literal label)
//   {{!Term}}      → (*“Term”*)             — define, proper-noun opt-out
//   {{snake_key}}  → *“Some Key”*           — reference (no parens, no article)
//   {{$snake_key}} → <expansion> (the *“Some Key”*) — introduce
//   {{!$snake_key}}→ <expansion> (*“Some Key”*)     — introduce, no article
//
// `{{Term}}` vs `{{snake_key}}` is disambiguated by snake_case: an identifier
// matching /^[a-z][a-z0-9_]*$/ is treated as a key lookup; anything else
// (capitalised words, spaces) is a literal label.
//
// The introduction expansion (for `{{$key}}`) resolves to:
//   1. values[key], if set
//   2. else schema[key].long, if declared
//   3. else nothing — the marker collapses to a plain define
//
// Articles default to "the" for defining forms; suppress per-marker with `!`
// or per-key via `schema[key].article: false`. Reference form never emits an
// article — the surrounding prose owns it ("the {{some_key}} shall…").

import { TextRun } from 'docx';

import type { PandocInline, Schema } from './types';
import { termLabel, termArticle, termLong } from './values';

type Run = TextRun;

const KEY_RE = /^[a-z][a-z0-9_]*$/;

interface MarkerCtx {
  values: Record<string, unknown>;
  schema: Schema | undefined;
}

// Only set bold/italic when true so heading-style bold isn't overridden.
function makeRun(text: string, bold: boolean, italic: boolean): Run {
  return new TextRun({
    text,
    ...(bold   ? { bold: true }    : {}),
    ...(italic ? { italics: true } : {}),
  });
}

/** Parenthetical defined-term emission: `(the *“Label”*)` or `(*“Label”*)`. */
function emitDefine(label: string, article: boolean, bold: boolean, italic: boolean, out: Run[]): void {
  out.push(makeRun(article ? '(the ' : '(', bold, italic));
  out.push(makeRun(`“${label}”`, true, true));
  out.push(makeRun(')', bold, italic));
}

/** Inline reference (no parens): `*“Label”*`. Always bold-italic to match define style. */
function emitReference(label: string, out: Run[]): void {
  out.push(makeRun(`“${label}”`, true, true));
}

function emitMarker(
  rawInner: string,
  bold: boolean,
  italic: boolean,
  out: Run[],
  ctx: MarkerCtx,
): void {
  let inner = rawInner.trim();

  // Strip and remember the proper-noun sigil (in either order: !$ or $!).
  let properOverride = false;
  if (inner.startsWith('!')) { properOverride = true; inner = inner.slice(1).trim(); }

  // {{$key}} or {{!$key}} — introduce (expand + define).
  if (inner.startsWith('$')) {
    const key = inner.slice(1).trim();
    const value = ctx.values[key];
    const expansion = value != null && value !== ''
      ? String(value)
      : (termLong(key, ctx.schema) ?? '');
    if (expansion) out.push(makeRun(`${expansion} `, bold, italic));
    const article = !properOverride && termArticle(key, ctx.schema);
    emitDefine(termLabel(key, ctx.schema), article, bold, italic, out);
    return;
  }

  // {{snake_key}} — reference; no article either way.
  if (KEY_RE.test(inner)) {
    emitReference(termLabel(inner, ctx.schema), out);
    return;
  }

  // {{Term}} or {{!Term}} — literal label, define inline.
  // No schema lookup for literal labels — the `!` sigil is the only article control.
  emitDefine(inner, !properOverride, bold, italic, out);
}

// Scan plain text for `{{...}}` markers, emitting runs for both the surrounding
// text and each marker.
function emitText(
  text: string,
  bold: boolean,
  italic: boolean,
  out: Run[],
  ctx: MarkerCtx,
): void {
  const re = /\{\{([^}]+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push(makeRun(text.slice(last, m.index), bold, italic));
    }
    emitMarker(m[1]!, bold, italic, out, ctx);
    last = m.index + m[0].length;
  }

  if (last < text.length) {
    out.push(makeRun(text.slice(last), bold, italic));
  }
}

// Flatten consecutive Str/Space/SoftBreak/LineBreak nodes into a single text
// string so `{{Multi Word Term}}` markers that pandoc split across tokens can
// be matched by emitText's regex.
function gatherText(inlines: PandocInline[], start: number): { text: string; end: number } {
  let text = '';
  let i = start;

  while (i < inlines.length) {
    const n = inlines[i]!;
    if      (n.t === 'Str')                                                   text += n.c as string;
    else if (n.t === 'Space' || n.t === 'SoftBreak' || n.t === 'LineBreak')   text += ' ';
    else break;
    i++;
  }

  return { text, end: i };
}

/** Convert a Pandoc inline node array into an array of docx TextRuns.
 *  Handles Strong, Emph, Quoted, Code, Span, and the three `{{...}}` marker forms. */
export function inlinesToRuns(
  inlines: PandocInline[],
  opts: { bold?: boolean; italic?: boolean; values?: Record<string, unknown>; schema?: Schema } = {},
): Run[] {
  const { bold = false, italic = false, values = {}, schema } = opts;
  const ctx: MarkerCtx = { values, schema };
  const out: Run[] = [];

  for (let i = 0; i < inlines.length; i++) {
    const node = inlines[i]!;

    switch (node.t) {
      case 'Str':
      case 'Space':
      case 'SoftBreak':
      case 'LineBreak': {
        const { text, end } = gatherText(inlines, i);
        emitText(text, bold, italic, out, ctx);
        i = end - 1;
        break;
      }

      case 'Strong':
        out.push(...inlinesToRuns(node.c as PandocInline[], { bold: true, italic, values, schema }));
        break;

      case 'Emph':
      case 'Underline':
        out.push(...inlinesToRuns(node.c as PandocInline[], { bold, italic: true, values, schema }));
        break;

      case 'Strikeout':
        out.push(...inlinesToRuns(node.c as PandocInline[], { bold, italic, values, schema }));
        break;

      case 'Quoted': {
        const [quoteType, contents] = node.c as [{ t: string }, PandocInline[]];
        const open  = quoteType.t === 'DoubleQuote' ? '“' : '‘';
        const close = quoteType.t === 'DoubleQuote' ? '”' : '’';
        out.push(makeRun(open, bold, italic));
        out.push(...inlinesToRuns(contents, { bold, italic, values, schema }));
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
        out.push(...inlinesToRuns(contents, { bold, italic, values, schema }));
        break;
      }

      // Note, Cite, Image, Link, RawInline, Math: ignored.
    }
  }

  return out;
}
