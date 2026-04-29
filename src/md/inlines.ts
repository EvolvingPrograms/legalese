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
// (capitalized words, spaces) is a literal label.
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

/** Render a value for use in `{{$key}}` introductions.
 *  Arrays become Oxford-comma lists ("A, B, and C"); strings/numbers stringify
 *  as-is; null/undefined/empty-string become null so the caller falls back to
 *  schema.long. */
function formatExpansion(value: unknown): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const parts = value.map((v) => String(v)).filter((s) => s !== '');
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0]!;
    if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
    return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
  }
  const s = String(value);
  return s === '' ? null : s;
}

/** Parenthetical defined-term emission: `(<article> *“Label”*)` or `(*“Label”*)`.
 *  `article` is the literal string ("the", "a", "such", …) or null for none. */
function emitDefine(label: string, article: string | null, bold: boolean, italic: boolean, out: Run[]): void {
  out.push(makeRun(article ? `(${article} ` : '(', bold, italic));
  out.push(makeRun(`“${label}”`, true, true));
  out.push(makeRun(')', bold, italic));
}

/** Inline-styled introduction (no parens): `<article> *“Label”*`.
 *  `sentenceStart` capitalizes the article. */
function emitInline(label: string, article: string | null, sentenceStart: boolean, bold: boolean, italic: boolean, out: Run[]): void {
  if (article) {
    const a = sentenceStart ? cap(article) : article;
    out.push(makeRun(`${a} `, bold, italic));
  }
  out.push(makeRun(`“${label}”`, true, true));
}

/** Capitalize the first character of a string. */
function cap(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

/** Inline reference: `<article> Label` as plain capitalized prose, no styling.
 *  Standard legal convention: define a term once with parens + italics + quotes,
 *  then reference it as plain capitalized prose ("the Writer's Share"). The
 *  article is the schema's article for the key (default "the"); pass null to
 *  suppress it. The `sentenceStart` flag capitalizes the article ("the" → "The"). */
function emitReference(label: string, article: string | null, sentenceStart: boolean, bold: boolean, italic: boolean, out: Run[]): void {
  if (article) {
    const a = sentenceStart ? cap(article) : article;
    out.push(makeRun(`${a} ${label}`, bold, italic));
  } else {
    out.push(makeRun(label, bold, italic));
  }
}

function emitMarker(
  rawInner: string,
  bold: boolean,
  italic: boolean,
  out: Run[],
  ctx: MarkerCtx,
  sentenceStart: boolean,
): void {
  let inner = rawInner.trim();

  let properOverride = false;
  if (inner.startsWith('!')) { properOverride = true; inner = inner.slice(1).trim(); }

  // {{$key}} — introduce a defined term.
  //   With expansion (value or schema.long):  <expansion> (<article> *“Term”*)
  //   Without expansion:                      <article> *“Term”*    — inline styled
  if (inner.startsWith('$')) {
    const key = inner.slice(1).trim();
    const value = ctx.values[key];
    const expansion = formatExpansion(value) ?? termLong(key, ctx.schema) ?? '';
    const article = termArticle(key, ctx.schema);
    const label = termLabel(key, ctx.schema);
    if (expansion) {
      const exp = sentenceStart ? cap(expansion) : expansion;
      out.push(makeRun(`${exp} `, bold, italic));
      emitDefine(label, article, bold, italic, out);
    } else {
      emitInline(label, article, sentenceStart, bold, italic, out);
    }
    return;
  }

  // {{snake_key}} reference — auto-article from schema + plain label.
  // {{!snake_key}} reference — suppress the article (author writes own determiner).
  if (KEY_RE.test(inner)) {
    const article = properOverride ? null : termArticle(inner, ctx.schema);
    emitReference(termLabel(inner, ctx.schema), article, sentenceStart, bold, italic, out);
    return;
  }

  // {{Term}}  — literal define, parenthetical: "(the *“Term”*)"
  // {{!Term}} — literal define, inline-styled, no parens: "*“Term”*"
  if (properOverride) emitInline(inner, null, sentenceStart, bold, italic, out);
  else                emitDefine(inner, 'the', bold, italic, out);
}

// Scan plain text for `{{...}}` markers, emitting runs for both the surrounding
// text and each marker. `paragraphStart` is true when this is the very first
// emit in a paragraph — used to detect sentence-start for marker capitalization.
function emitText(
  text: string,
  bold: boolean,
  italic: boolean,
  out: Run[],
  ctx: MarkerCtx,
  paragraphStart: boolean,
): void {
  const re = /\{\{([^}]+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    const preceding = text.slice(0, m.index);
    if (m.index > last) {
      out.push(makeRun(text.slice(last, m.index), bold, italic));
    }
    const trimmed = preceding.replace(/\s+$/, '');
    const sentenceStart = trimmed === ''
      ? paragraphStart                  // marker at start of gathered text
      : /[.!?]$/.test(trimmed);         // mid-text — preceding ends with terminal punctuation
    emitMarker(m[1]!, bold, italic, out, ctx, sentenceStart);
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
 *  Handles Strong, Emph, Quoted, Code, Span, and the three `{{...}}` marker forms.
 *  `paragraphStart` (default true) is used by the marker layer to capitalize
 *  articles when a marker sits at the start of a sentence/paragraph. */
export function inlinesToRuns(
  inlines: PandocInline[],
  opts: {
    bold?: boolean; italic?: boolean;
    values?: Record<string, unknown>; schema?: Schema;
    paragraphStart?: boolean;
  } = {},
): Run[] {
  const { bold = false, italic = false, values = {}, schema, paragraphStart = true } = opts;
  const ctx: MarkerCtx = { values, schema };
  const out: Run[] = [];

  // Track whether the next emit is at paragraph-start. Flip to false after
  // anything has been emitted into `out` (text, marker, or styled child).
  let atParaStart = paragraphStart;

  for (let i = 0; i < inlines.length; i++) {
    const node = inlines[i]!;
    const passParaStart = atParaStart;

    switch (node.t) {
      case 'Str':
      case 'Space':
      case 'SoftBreak':
      case 'LineBreak': {
        const { text, end } = gatherText(inlines, i);
        emitText(text, bold, italic, out, ctx, passParaStart);
        i = end - 1;
        break;
      }

      case 'Strong':
        out.push(...inlinesToRuns(node.c as PandocInline[], { bold: true, italic, values, schema, paragraphStart: passParaStart }));
        break;

      case 'Emph':
      case 'Underline':
        out.push(...inlinesToRuns(node.c as PandocInline[], { bold, italic: true, values, schema, paragraphStart: passParaStart }));
        break;

      case 'Strikeout':
        out.push(...inlinesToRuns(node.c as PandocInline[], { bold, italic, values, schema, paragraphStart: passParaStart }));
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

    // After the first content-bearing node, no longer at paragraph start.
    if (out.length > 0) atParaStart = false;
  }

  return out;
}
