// Legalese's `{{...}}` marker emitter for the markdsl/docx renderer.
//
// Marker forms:
//
//   {{Term}}       → (the *“Term”*)              — define inline (parens)
//   {{!Term}}      → *“Term”*                     — define inline-styled, no parens
//   {{snake_key}}  → <article> Some Key           — reference, plain capitalized
//   {{!snake_key}} → Some Key                     — reference, no article
//   {{$snake_key}} → <expansion> (<article> *“Some Key”*) — introduce + define
//   {{=key}}       → bare value (or fill-in BLANK)
//   {{^TEXT}}      → small-caps literal
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

// CRITICAL: import TextRun from markdsl/docx (not 'docx' directly).
// The renderer was built against markdsl's docx instance; constructing
// TextRuns from a different instance fails docx's `instanceof` checks
// during XML serialization and runs come out as `<rootKey>w:r</rootKey>`.
import { TextRun, type MarkerEmitter } from 'markdsl/docx';
import { termLabel, termDef } from 'markdsl';

const KEY_RE = /^[a-z][a-z0-9_]*$/i;

/** Fill-in blank rendered for required-but-missing introductions
 *  (`{{$the_X}}` where the schema marks `X` as `required: true` and no
 *  value was supplied). Single source of truth — tests reference this
 *  export so a width change here doesn't ripple into expectations. */
export const BLANK = '__________________';

// Only set bold/italic/etc. when true so heading-style bold isn't overridden.
function makeRun(
  text: string,
  bold: boolean,
  italic: boolean,
  smallCaps = false,
): TextRun {
  return new TextRun({
    text,
    ...(bold      ? { bold: true }      : {}),
    ...(italic    ? { italics: true }   : {}),
    ...(smallCaps ? { smallCaps: true } : {}),
  });
}

/** Render a value for use in `{{$key}}` introductions. Primitive arrays
 *  become Oxford-comma lists; strings/numbers stringify; null/undefined/
 *  empty-string and arrays of objects → null so the caller falls back
 *  to schema.def.
 *
 *  Internal newlines fold into spaces — YAML `|-` block scalars used to
 *  wrap long single-sentence values shouldn't introduce hard line breaks
 *  into prose. */
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

function foldLines(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function cap(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

/** Parenthetical defined-term emission: `(<article> *“Label”*)`. */
function emitDefine(label: string, article: string | null, bold: boolean, italic: boolean, out: TextRun[]): void {
  out.push(makeRun(article ? `(${article} ` : '(', bold, italic));
  out.push(makeRun(`“${label}”`, true, true));
  out.push(makeRun(')', bold, italic));
}

/** Inline-styled introduction (no parens): `<article> *“Label”*`. */
function emitInline(label: string, article: string | null, capArticle: boolean, bold: boolean, italic: boolean, out: TextRun[]): void {
  if (article) out.push(makeRun(`${capArticle ? cap(article) : article} `, bold, italic));
  out.push(makeRun(`“${label}”`, true, true));
}

/** Inline reference: `<article> Label` as plain capitalized prose. */
function emitReference(label: string, article: string | null, capArticle: boolean, bold: boolean, italic: boolean, out: TextRun[]): void {
  if (article) {
    out.push(makeRun(`${capArticle ? cap(article) : article} ${label}`, bold, italic));
  } else {
    out.push(makeRun(label, bold, italic));
  }
}

/** Split an article prefix (`the_` / `a_` / `an_`) off the marker key, if any. */
function stripArticlePrefix(inner: string): { articleRaw: string | null; key: string } {
  const m = inner.match(/^(the|a|an)_/i);
  if (!m) return { articleRaw: null, key: inner };
  return { articleRaw: m[1]!, key: inner.slice(m[0].length) };
}

/** Pick "a" vs "an" based on the leading sound of the term. */
function pickAOrAn(term: string): 'a' | 'an' {
  const first = term.trim().toLowerCase();
  if (/^(honor|honest|hour|heir)/.test(first)) return 'an';
  if (/^(uni|use|user|euro|one)/.test(first)) return 'a';
  return /^[aeiou]/.test(first) ? 'an' : 'a';
}

export const legaleseMarkerEmitter: MarkerEmitter = (rawInner, bold, italic, out, ctx, nextChar) => {
  let inner = rawInner.trim();

  // {{^TEXT}} — small-caps literal.
  if (inner.startsWith('^')) {
    out.push(makeRun(inner.slice(1).trim(), bold, italic, true));
    return;
  }

  // {{=key}} — bare value substitution.
  if (inner.startsWith('=')) {
    const tag = inner.slice(1).trim();
    const tagAllCaps = /^[A-Z][A-Z0-9_]*$/.test(tag);
    const tagWantsCap = /^[A-Z]/.test(tag);
    const tagKey = tag.toLowerCase();
    const value = ctx.values[tagKey];
    const valueExp = formatExpansion(value);
    if (valueExp === null || valueExp === '') {
      out.push(makeRun(BLANK, bold, italic));
      return;
    }
    let text = valueExp;
    if (nextChar === '.' && text.endsWith('.')) text = text.slice(0, -1);
    if (tagAllCaps) text = text.toUpperCase();
    else if (tagWantsCap) text = text.charAt(0).toUpperCase() + text.slice(1);
    out.push(makeRun(text, bold, italic));
    return;
  }

  // {{$key}} — introduce a defined term.
  const isIntroduce = inner.startsWith('$');
  if (isIntroduce) inner = inner.slice(1).trim();

  const { articleRaw, key: afterPrefix } = stripArticlePrefix(inner);
  inner = afterPrefix;

  const wantsCap = articleRaw ? /^[A-Z]/.test(articleRaw) : false;
  const lookupKey = inner.toLowerCase();
  const allCaps = /^[A-Z][A-Z0-9_]*$/.test(inner);

  function resolveArticle(label: string): string | null {
    if (!articleRaw) return null;
    const lc = articleRaw.toLowerCase();
    let article = lc === 'the' ? 'the' : pickAOrAn(label);
    if (wantsCap) article = cap(article);
    return article;
  }

  if (isIntroduce) {
    const value = ctx.values[lookupKey];
    const valueIsMissing = value === undefined || value === null || value === '';
    const valuePart = formatExpansion(value);
    const defPart = termDef(lookupKey, ctx.schema);
    const expansion = [valuePart, defPart].filter((s): s is string => !!s).join(', ');
    const rawLabel = termLabel(lookupKey, ctx.schema);
    const label = allCaps ? rawLabel.toUpperCase() : rawLabel;
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
      const entry = ctx.schema?.[lookupKey];
      const isRequired = typeof entry === 'object' && entry !== null && entry.required === true;
      if (isRequired && valueIsMissing) {
        out.push(makeRun(`${BLANK} `, bold, italic));
        emitDefine(label, parenArticle, bold, italic, out);
      } else {
        emitInline(label, resolveArticle(label), false, bold, italic, out);
      }
    }
    return;
  }

  // Snake_case reference.
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

  // {{Term}} / {{!Term}}
  if (inner.startsWith('!')) emitInline(inner.slice(1).trim(), null, false, bold, italic, out);
  else                       emitDefine(inner, 'the', bold, italic, out);
};
