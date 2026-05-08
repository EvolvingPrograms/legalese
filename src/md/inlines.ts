// Pandoc inline AST -> docx TextRun[] conversion.
//
// Marker forms:
//
//   {{Term}}       → (the *“Term”*)              — define inline (parens)
//   {{!Term}}      → *“Term”*                     — define inline-styled, no parens
//   {{snake_key}}  → <article> Some Key           — reference, plain capitalized
//   {{!snake_key}} → Some Key                     — reference, no article
//   {{$snake_key}} → <expansion> (<article> *“Some Key”*) — introduce + define
//
// **Capitalization signal**: an uppercase first letter on the marker key is
// the explicit "capitalize the article / expansion" signal. Sentence-start
// detection is intentionally absent — the author writes `{{Operator}}` (cap)
// vs `{{operator}}` (lower) to control output. `{{Operator}}` → "The Operator".
//
// **Case-insensitive lookup**: `{{Operator}}` resolves to schema's `operator`.
//
// **Snake_case disambiguator** (kept for backward compat): a single capitalized
// word like `{{Term}}` falls through to literal-define unless schema has the
// lowercased key directly — preserves `{{!Compositions}}` inline-styled idiom.
//
// `{{$key}}` expansion resolves to:
//   1. values[key], if set
//   2. else schema[key].def, if declared
//   3. else collapses to inline-styled (no parens)

import { TextRun } from 'docx';

import type { PandocInline, Schema } from './types';
import { termLabel, termDef } from './values';

type Run = TextRun;

const KEY_RE = /^[a-z][a-z0-9_]*$/i;

/** Fill-in blank rendered for required-but-missing introductions
 *  (`{{$the_X}}` where the schema marks `X` as `required: true` and no
 *  value was supplied). Single source of truth — tests reference this
 *  export so a width change here doesn't ripple into expectations. */
export const BLANK = '__________________';

interface MarkerCtx {
  values: Record<string, unknown>;
  schema: Schema | undefined;
}

// Only set bold/italic when true so heading-style bold isn't overridden.
function makeRun(text: string, bold: boolean, italic: boolean, smallCaps = false): Run {
  return new TextRun({
    text,
    ...(bold      ? { bold: true }      : {}),
    ...(italic    ? { italics: true }   : {}),
    ...(smallCaps ? { smallCaps: true } : {}),
  });
}

/** Render a value for use in `{{$key}}` introductions.
 *  Primitive arrays become Oxford-comma lists ("A, B, and C"); strings/numbers
 *  stringify as-is; null/undefined/empty-string and arrays of objects become
 *  null so the caller falls back to schema.def. (Object arrays are catalog
 *  data for `grids from: $key`, not term expansions.)
 *
 *  Internal newlines fold into spaces — YAML `|-` block scalars used to wrap
 *  long single-sentence values shouldn't introduce hard line breaks into
 *  prose. Use markdown paragraph breaks if you actually want a break. */
export function formatExpansion(value: unknown): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    if (value.some((v) => v != null && typeof v === 'object')) return null;
    const parts = value.map((v) => foldLines(String(v))).filter((s) => s !== '');
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0]!;
    if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
    return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
  }
  if (typeof value === 'object') return null;
  const s = foldLines(String(value));
  return s === '' ? null : s;
}

/** Collapse runs of whitespace (including newlines) into single spaces. */
function foldLines(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Capitalize the first character of a string. */
function cap(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

/** Parenthetical defined-term emission: `(<article> *“Label”*)` or `(*“Label”*)`.
 *  `article` is the literal string ("the", "a", "such", …) or null for none.
 *  Article inside parens is conventionally lowercase even at sentence start. */
function emitDefine(label: string, article: string | null, bold: boolean, italic: boolean, out: Run[]): void {
  out.push(makeRun(article ? `(${article} ` : '(', bold, italic));
  out.push(makeRun(`“${label}”`, true, true));
  out.push(makeRun(')', bold, italic));
}

/** Inline-styled introduction (no parens): `<article> *“Label”*`.
 *  `capArticle` capitalizes the article (signaled by uppercase first char in marker). */
function emitInline(label: string, article: string | null, capArticle: boolean, bold: boolean, italic: boolean, out: Run[]): void {
  if (article) {
    out.push(makeRun(`${capArticle ? cap(article) : article} `, bold, italic));
  }
  out.push(makeRun(`“${label}”`, true, true));
}

/** Inline reference: `<article> Label` as plain capitalized prose, no styling.
 *  `capArticle` capitalizes the article. */
function emitReference(label: string, article: string | null, capArticle: boolean, bold: boolean, italic: boolean, out: Run[]): void {
  if (article) {
    out.push(makeRun(`${capArticle ? cap(article) : article} ${label}`, bold, italic));
  } else {
    out.push(makeRun(label, bold, italic));
  }
}

/** Split an article prefix (`the_` / `a_` / `an_`) off the marker key, if any.
 *  Returns `{ articleRaw: string | null, key: string }`.
 *  `articleRaw` preserves the author's case so we can detect the capital signal. */
function stripArticlePrefix(inner: string): { articleRaw: string | null; key: string } {
  const m = inner.match(/^(the|a|an)_/i);
  if (!m) return { articleRaw: null, key: inner };
  return { articleRaw: m[1]!, key: inner.slice(m[0].length) };
}

/** Pick "a" vs "an" based on the leading sound of the term.
 *  Vowel-letter heuristic with a small list of common exceptions. */
function pickAOrAn(term: string): 'a' | 'an' {
  const first = term.trim().toLowerCase();
  // Common exceptions: "an honor", "a unicorn", "a one-time", "a user".
  if (/^(honor|honest|hour|heir)/.test(first)) return 'an';
  if (/^(uni|use|user|euro|one)/.test(first)) return 'a';
  return /^[aeiou]/.test(first) ? 'an' : 'a';
}

function emitMarker(
  rawInner: string,
  bold: boolean,
  italic: boolean,
  out: Run[],
  ctx: MarkerCtx,
): void {
  let inner = rawInner.trim();

  // {{^TEXT}} — small-caps literal. Standard legal-drafting treatment for
  // "WHEREAS", "RESOLVED", "WITNESSETH" etc. in board resolutions and
  // formal recitals. Emits the literal text as a small-caps run, preserving
  // bold/italic context.
  if (inner.startsWith('^')) {
    out.push(makeRun(inner.slice(1).trim(), bold, italic, true));
    return;
  }

  // {{=key}} — bare value substitution. Resolves values → def → label and
  // emits just the resolved string (no parens, no styling) with case
  // applied per the marker's case signal. Useful for headings like
  // "BOARD RESOLUTIONS OF {{=COMPANY}}".
  if (inner.startsWith('=')) {
    const tag = inner.slice(1).trim();
    const tagAllCaps = /^[A-Z][A-Z0-9_]*$/.test(tag);
    const tagWantsCap = /^[A-Z]/.test(tag);
    const tagKey = tag.toLowerCase();
    const value = ctx.values[tagKey];
    const valueExp = formatExpansion(value);
    const resolved = valueExp ?? termDef(tagKey, ctx.schema) ?? termLabel(tagKey, ctx.schema);
    let text = resolved;
    if (tagAllCaps) text = text.toUpperCase();
    else if (tagWantsCap) text = text[0]!.toUpperCase() + text.slice(1);
    out.push(makeRun(text, bold, italic));
    return;
  }

  // {{$key}} — introduce a defined term (parens with article).
  const isIntroduce = inner.startsWith('$');
  if (isIntroduce) inner = inner.slice(1).trim();

  // Article prefix on reference / introduce: `the_X`, `a_X`, `an_X`.
  const { articleRaw, key: afterPrefix } = stripArticlePrefix(inner);
  inner = afterPrefix;

  // Capitalization signal — only the article prefix's case carries meaning
  // ({{The_X}} → "The X", {{the_X}} → "the X"). Key-case is purely cosmetic:
  // {{$Claude}} and {{$claude}} produce identical output, because the label
  // comes from schema.term, not the marker. Mixing key-case is allowed so
  // markers can mirror the rendered prose for readability.
  const wantsCap = articleRaw ? /^[A-Z]/.test(articleRaw) : false;
  const lookupKey = inner.toLowerCase();

  // All-caps marker ({{COMPANY}}, {{the_COMPANY}}) → uppercase the rendered
  // label/expansion. Useful for title-style references where the company name
  // wants caps even though it's stored in mixed case.
  const allCaps = /^[A-Z][A-Z0-9_]*$/.test(inner);

  // Resolve the article for the marker. Prefix takes precedence; otherwise no
  // article is emitted.
  function resolveArticle(label: string): string | null {
    if (!articleRaw) return null;
    const lc = articleRaw.toLowerCase();
    let article = lc === 'the' ? 'the' : pickAOrAn(label);
    if (wantsCap) article = cap(article);
    return article;
  }

  // {{$key}} / {{$the_key}} / {{$a_key}} — introduce a defined term.
  // Compose value + def with a comma when both are set: this matches the
  // standard legal pattern "Acme Inc., a Delaware corporation (the *X*)".
  // If only one is set, use it alone; if neither, fall through to the
  // missing-value branch below.
  if (isIntroduce) {
    const value = ctx.values[lookupKey];
    const valueIsMissing = value === undefined || value === null || value === '';
    const valuePart = formatExpansion(value);
    const defPart = termDef(lookupKey, ctx.schema);
    const expansion = [valuePart, defPart].filter((s): s is string => !!s).join(', ');
    const rawLabel = termLabel(lookupKey, ctx.schema);
    const label = allCaps ? rawLabel.toUpperCase() : rawLabel;
    // Article inside the parenthetical define stays lowercase even when the
    // marker is capitalized for sentence start — the cap signal applies to
    // the expansion only. Standard legal style: "An initial term… (an *Term*)".
    const articleRawLower = articleRaw?.toLowerCase() ?? null;
    const parenArticle = articleRawLower
      ? (articleRawLower === 'the' ? 'the' : pickAOrAn(label))
      : null;
    if (expansion) {
      let exp = wantsCap ? cap(expansion) : expansion;
      if (allCaps) exp = exp.toUpperCase();
      out.push(makeRun(`${exp} `, bold, italic));
      emitDefine(label, parenArticle, bold, italic, out);
    } else {
      // No value, no def. Two cases share this path:
      //   1. Schema marks the key `required: true` — author expects a
      //      per-deal value here, so render a fill-in blank with the
      //      parenthetical define so the unfilled spot is visually
      //      obvious in a draft. Once the blank is hand-filled (or the
      //      doc re-rendered with values) the prose reads correctly.
      //   2. Otherwise — author intentionally omitted def/value to use
      //      the introduce form as an inline-styled definition (no
      //      parens), e.g. "individually {{$a_Party}}" → "individually
      //      a *Party*". Preserve that stylistic idiom.
      const entry = ctx.schema?.[lookupKey];
      const isRequired = typeof entry === 'object' && entry !== null && entry.required === true;
      // Only fill-in-blank when the value is actually missing. If the
      // caller supplied something but it wasn't a usable expansion
      // (e.g. object array for a grid catalog), preserve the old
      // inline-styled fallback.
      if (isRequired && valueIsMissing) {
        out.push(makeRun(`${BLANK} `, bold, italic));
        emitDefine(label, parenArticle, bold, italic, out);
      } else {
        emitInline(label, resolveArticle(label), false, bold, italic, out);
      }
    }
    return;
  }

  // Snake_case reference: `{{key}}` plain, `{{the_key}}` / `{{a_key}}` with article.
  // Case-insensitive lookup. Single capitalized word with no schema hit falls
  // through to literal-define (preserves the `{{!Compositions}}` idiom);
  // capitalized multi-word keys (with underscore) always resolve as references
  // so plurals like `{{Renewal_terms}}` work via bidirectional schema lookup.
  if (KEY_RE.test(inner)) {
    const isLowercase = inner === lookupKey;
    const directSchemaHit = ctx.schema?.[lookupKey] !== undefined;
    const hasUnderscore = inner.includes('_');
    if (isLowercase || directSchemaHit || articleRaw || hasUnderscore) {
      const rawLabel = termLabel(lookupKey, ctx.schema);
      const label = allCaps ? rawLabel.toUpperCase() : rawLabel;
      const article = resolveArticle(label);
      emitReference(label, article, false, bold, italic, out);
      return;
    }
  }

  // {{Term}}  — literal define, parenthetical: "(the *“Term”*)"
  // {{!Term}} — literal define, inline-styled, no parens: "*“Term”*"
  if (inner.startsWith('!')) emitInline(inner.slice(1).trim(), null, false, bold, italic, out);
  else                       emitDefine(inner, 'the', bold, italic, out);
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
 *  Handles Strong, Emph, Quoted, Code, Span, and the `{{...}}` marker forms. */
export function inlinesToRuns(
  inlines: PandocInline[],
  opts: {
    bold?: boolean; italic?: boolean;
    values?: Record<string, unknown>; schema?: Schema;
  } = {},
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
