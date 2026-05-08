// Resolve `{{...}}` markers into markdown text.
//
// The docx pipeline walks the Pandoc AST and emits TextRuns for each marker
// (see inlines.ts). For HTML / JSON / markdown output we'd rather not
// reimplement the whole AST-walking renderer — we substitute markers in the
// SOURCE markdown with their rendered form (using markdown's own emphasis
// syntax: `*italic*`, `**bold**`, `***bold italic***`, `"quoted"`), then let
// pandoc parse the substituted source into a normal AST.
//
// The output is plain markdown that:
//   - reads correctly in any markdown renderer,
//   - parses to a Pandoc AST with proper Emph / Strong / Quoted nodes when
//     piped to pandoc with the same `+smart` flag the docx pipeline uses,
//   - has no leftover `{{...}}` patterns.
//
// Behaviour mirrors processInline (inlines.ts) so the rendered text matches
// what the docx pipeline produces; differences are limited to small-caps
// (no native markdown for it — emit `<span class="legalese-smallcaps">`
// which any HTML pipeline can style).

import { BLANK } from './inlines';
import { formatExpansion } from './inlines';
import {
  termLabel,
  termDef,
} from './values';
import type { Schema, SchemaEntry } from './types';

// Unicode curly quotes — `+smart` would convert `"..."` itself, but keeping
// them literal in the substitution lets the result render correctly in
// markdown viewers that don't run smart punctuation.
const LQ = '“';
const RQ = '”';

const KEY_RE = /^[a-z][a-z0-9_]*$/i;

/** Pick `a` vs `an` based on the first letter of the resolved label. */
function pickAOrAn(label: string): string {
  return /^[aeiouAEIOU]/.test(label) ? 'an' : 'a';
}

function cap(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

/** `***"Term"***` — bold + italic, curly-quoted. Used inside parens for
 *  defined-term emphasis. */
function emphTerm(label: string): string {
  return `***${LQ}${label}${RQ}***`;
}

/** `(${article} ***"Term"***)` — parenthetical define. */
function emitDefine(label: string, article: string | null): string {
  return article ? `(${article} ${emphTerm(label)})` : `(${emphTerm(label)})`;
}

/** `${article} ***"Term"***` — inline-styled, no parens. `capArticle`
 *  capitalizes the article (sentence-start signal). */
function emitInline(label: string, article: string | null, capArticle: boolean): string {
  if (!article) return emphTerm(label);
  return `${capArticle ? cap(article) : article} ${emphTerm(label)}`;
}

/** `${article} ${label}` — plain reference, no styling. */
function emitReference(label: string, article: string | null): string {
  return article ? `${article} ${label}` : label;
}

interface MarkerCtx {
  schema?: Schema;
  values: Record<string, unknown>;
}

/** Render a single marker's inner contents (without the `{{` / `}}`) into
 *  markdown text. Mirrors processInline in inlines.ts. */
function renderMarker(raw: string, ctx: MarkerCtx): string {
  const inner = raw.trim();

  // {{^TEXT}} — small-caps run. No markdown native; HTML span is the
  // closest portable form.
  if (inner.startsWith('^')) {
    const text = inner.slice(1).trim();
    return `<span class="legalese-smallcaps">${text}</span>`;
  }

  // {{=key}} — bare value substitution. Resolves through values → def →
  // label and emits just the resolved string with case applied per the
  // case signal in the marker:
  //   {{=customer}} → "Acme Inc." (verbatim)
  //   {{=Customer}} → "Acme Inc." (first letter cap)
  //   {{=CUSTOMER}} → "ACME INC." (uppercase)
  // No parens, no styling — useful for "BLAH BLAH OF {{=COMPANY}}".
  if (inner.startsWith('=')) {
    const tag = inner.slice(1).trim();
    const tagAllCaps = /^[A-Z][A-Z0-9_]*$/.test(tag);
    const tagWantsCap = /^[A-Z]/.test(tag);
    const tagKey = tag.toLowerCase();
    const value = ctx.values[tagKey];
    const valueExp = formatExpansion(value);
    const resolved = valueExp ?? termDef(tagKey, ctx.schema) ?? termLabel(tagKey, ctx.schema);
    if (tagAllCaps) return resolved.toUpperCase();
    if (tagWantsCap) return cap(resolved);
    return resolved;
  }

  // Strip introduce / literal prefix BEFORE article detection.
  let work = inner;
  const isIntroduce = work.startsWith('$');
  const isLiteral = !isIntroduce && work.startsWith('!');
  if (isIntroduce || isLiteral) work = work.slice(1).trim();

  // Article prefix: the_, a_, an_ (case-preserving).
  let articleRaw: string | null = null;
  let wantsCap = false;
  const articleMatch = work.match(/^(the|a|an)_/i);
  if (articleMatch) {
    const prefix = articleMatch[0];
    articleRaw = prefix.slice(0, -1).toLowerCase();
    wantsCap = /^[A-Z]/.test(prefix);
    work = work.slice(prefix.length);
  } else if (/^[A-Z]/.test(work)) {
    wantsCap = true;
  }

  // ALL-CAPS marker → uppercase the substitution.
  const allCaps = /^[A-Z][A-Z0-9_]*$/.test(work);
  const lookupKey = work.toLowerCase();

  // Resolve label.
  const rawLabel = termLabel(lookupKey, ctx.schema);
  const label = allCaps ? rawLabel.toUpperCase() : rawLabel;

  // {{$key}} / {{$the_key}} / {{$a_key}} — introduce.
  // Compose value + def with a comma when both are set; matches the
  // standard legal "Acme Inc., a Delaware corporation (the *X*)" pattern.
  if (isIntroduce) {
    const value = ctx.values[lookupKey];
    const valueIsMissing = value === undefined || value === null || value === '';
    const valuePart = formatExpansion(value);
    const defPart = termDef(lookupKey, ctx.schema);
    const expansion = [valuePart, defPart].filter((s): s is string => !!s).join(', ');

    const parenArticle = articleRaw
      ? (articleRaw === 'the' ? 'the' : pickAOrAn(label))
      : null;

    if (expansion) {
      let exp = wantsCap ? cap(expansion) : expansion;
      if (allCaps) exp = exp.toUpperCase();
      return `${exp} ${emitDefine(label, parenArticle)}`;
    }

    // No value, no def. If schema marks the key required → fill-in blank
    // with parenthetical define; else preserve the inline-styled idiom.
    const entry: SchemaEntry | undefined = ctx.schema?.[lookupKey];
    const isRequired = typeof entry === 'object' && entry !== null && entry.required === true;
    if (isRequired && valueIsMissing) {
      return `${BLANK} ${emitDefine(label, parenArticle)}`;
    }
    return emitInline(label, articleRaw, wantsCap);
  }

  // {{!Term}} — literal inline-styled.
  if (isLiteral) {
    return emphTerm(label);
  }

  // Snake_case reference: {{key}} / {{the_key}} / {{a_key}}.
  if (KEY_RE.test(work)) {
    const isLowercase = work === lookupKey;
    const directHit = ctx.schema?.[lookupKey] !== undefined;
    const hasUnderscore = work.includes('_');
    if (isLowercase || directHit || articleRaw || hasUnderscore) {
      const article = articleRaw
        ? (articleRaw === 'the'
            ? (wantsCap ? 'The' : 'the')
            : (wantsCap ? cap(pickAOrAn(label)) : pickAOrAn(label)))
        : null;
      return emitReference(label, article);
    }
  }

  // {{Term}} — literal define, parenthetical "(the *"Term"*)".
  return emitDefine(work, 'the');
}

/** Substitute every `{{...}}` marker in `body` with its rendered markdown
 *  text. The output is valid markdown — pipe to pandoc, marked, remark,
 *  etc. for HTML / JSON / further processing. */
export function substituteMarkers(
  body: string,
  opts: { schema?: Schema; values?: Record<string, unknown> } = {},
): string {
  const ctx: MarkerCtx = { schema: opts.schema, values: opts.values ?? {} };
  return body.replace(/\{\{([^}]+)\}\}/g, (_, raw: string) => renderMarker(raw, ctx));
}
