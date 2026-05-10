// Resolve `{{...}}` markers into markdown text, using the markdsl
// framework's prefix-dispatch registry. The five legalese marker
// forms each become a small handler that composes markdsl primitives
// (parse / lookup / format / pickArticle / emitDefine / emitInline):
//
//   ^  small-caps           — literal pass-through with HTML span
//   =  bare value           — value or BLANK; case-signal applied
//   $  introduce            — value+def composed; parenthetical define
//   !  literal inline       — `***"Term"***`
//   '' (no prefix)          — plain reference / literal define
//
// Per-marker legalese policy (BLANK fallback for required-missing,
// value+def comma-compose, trailing-dot swallow, the wantsCap rule
// that distinguishes `the_X` from `The_X`) lives in the handlers.
// Mechanics live in markdsl.

import {
  defineMarker,
  substituteMarkers as markdslSubstitute,
  parseMarker,
  pickArticle,
  applyTextCase,
  emitDefine,
  emitInline,
  formatValue,
  lookupValue,
  termLabel,
  termDef,
  type MarkerHandler,
  type MarkerRegistry,
} from 'markdsl';

import { BLANK } from './inlines';
import type { Schema, SchemaEntry } from './types';

// ---- Helpers shared by handlers ----

const KEY_RE = /^[a-z][a-z0-9_]*$/i;
const LQ = '“';
const RQ = '”';

function emphTerm(label: string): string {
  return `***${LQ}${label}${RQ}***`;
}

function isRequired(key: string, schema: Schema | undefined): boolean {
  const entry: SchemaEntry | undefined = schema?.[key];
  return typeof entry === 'object' && entry !== null && entry.required === true;
}

// ---- The five marker handlers ----

/** {{^TEXT}} — small-caps run. No markdown native; HTML span is the
 *  closest portable form. The literal text is preserved verbatim
 *  (legacy doesn't swallow trailing dots inside small-caps). */
const smallCapsHandler: MarkerHandler = defineMarker((rest) => {
  return `<span class="legalese-smallcaps">${rest}</span>`;
});

/** {{=key}} — bare value substitution. Value or BLANK; case-signal is
 *  applied to the value if present. No def/label fallback — the form
 *  is explicitly "the value, or empty space".
 *
 *  Trailing-dot swallow: when the value ends with `.` (e.g. "Inc.")
 *  AND the source has another `.` immediately after the marker, drop
 *  the value's trailing dot to avoid `Inc..`. Using `ctx.next` from
 *  markdsl. */
const bareValueHandler: MarkerHandler = defineMarker((rest, ctx) => {
  const p = parseMarker(rest);
  const value = lookupValue(p.key, ctx.values);
  const valueExp = formatValue(value);
  if (valueExp === null || valueExp === '') return BLANK;
  let text = applyTextCase(valueExp, p);
  if (ctx.next === '.' && text.endsWith('.')) text = text.slice(0, -1);
  return text;
});

/** {{$the_key}} — introduce form. Composes value + def with a comma
 *  and attaches the parenthetical define. Falls through to a fill-in
 *  BLANK (with the parenthetical) if required-and-missing, or an
 *  inline-styled definition otherwise (the standard legal idiom for
 *  "individually a *Party*").
 *
 *  Capitalization policy (matches legacy semantics):
 *    - The article prefix's case governs sentence-start signal:
 *        `{{$the_X}}`  → lowercase article, no expansion-cap
 *        `{{$The_X}}`  → capital article, expansion gets cap'd
 *    - Without an article, the post-strip key's leading case governs:
 *        `{{$x}}`  → no cap on expansion
 *        `{{$X}}`  → cap on expansion (sentence-start)
 *    - ALL-CAPS key (`{{$X}}` with X fully uppercase) uppercases everything.
 *    - In short: capContent ALONE doesn't trigger the cap; only
 *      capArticle or no-article-with-cap. `applyTextCase` from markdsl
 *      uses capContent unconditionally, so we don't reuse it here. */
const introduceHandler: MarkerHandler = defineMarker((rest, ctx) => {
  const p = parseMarker(rest);
  const valuePart = formatValue(lookupValue(p.key, ctx.values));
  const defPart = termDef(p.key, ctx.schema);
  const expansion = [valuePart, defPart].filter((s): s is string => !!s).join(', ');

  const rawLabel = termLabel(p.key, ctx.schema);
  const label = p.upper ? rawLabel.toUpperCase() : rawLabel;
  const article = pickArticle(label, p.article);

  // wantsCap: capitalize the expansion at sentence start. Legacy
  // semantics — see the docblock above.
  const wantsCap = p.capArticle || (!p.article && p.capContent);

  if (expansion) {
    let exp = wantsCap ? expansion.charAt(0).toUpperCase() + expansion.slice(1) : expansion;
    if (p.upper) exp = exp.toUpperCase();
    return `${exp} ${emitDefine(label, article)}`;
  }

  // No value, no def. Required → fill-in blank; else inline-styled.
  if (isRequired(p.key, ctx.schema) && (valuePart === null || valuePart === '')) {
    return `${BLANK} ${emitDefine(label, article)}`;
  }
  return emitInline(label, article, p.capArticle);
});

/** {{!Term}} — literal inline-styled term, no parens. */
const literalInlineHandler: MarkerHandler = defineMarker((rest, ctx) => {
  const p = parseMarker(rest);
  const rawLabel = termLabel(p.key, ctx.schema);
  const label = p.upper ? rawLabel.toUpperCase() : rawLabel;
  return emphTerm(label);
});

/** {{key}} / {{the_key}} / {{Term}} — plain reference (or literal
 *  define if the key isn't a snake_case identifier and has no schema
 *  entry). */
const plainReferenceHandler: MarkerHandler = defineMarker((rest, ctx) => {
  const p = parseMarker(rest);
  const rawLabel = termLabel(p.key, ctx.schema);
  const label = p.upper ? rawLabel.toUpperCase() : rawLabel;

  if (KEY_RE.test(p.rest)) {
    const isLowercase = p.rest === p.key;
    const directHit = ctx.schema?.[p.key] !== undefined;
    const hasUnderscore = p.rest.includes('_');
    if (isLowercase || directHit || p.article || hasUnderscore) {
      // Reference path — plain capitalized prose, no styling.
      const article = p.article
        ? (p.article === 'the'
            ? (p.capArticle ? 'The' : 'the')
            : (p.capArticle
                ? pickArticle(label, p.article)?.charAt(0).toUpperCase() + (pickArticle(label, p.article)?.slice(1) ?? '')
                : pickArticle(label, p.article)))
        : null;
      return article ? `${article} ${label}` : label;
    }
  }

  // {{Term}} (capitalized single word, no schema hit) → literal-define
  // parenthetical, conventional `(the *"Term"*)`.
  return emitDefine(p.rest, 'the');
});

// ---- The registry ----

/** Marker registry mirroring legalese's existing semantics. Pass to
 *  `markdsl.substituteMarkers` (or use the wrapping `substituteMarkers`
 *  helper below for trailing-dot swallow on top of markdsl's walker). */
export const legaleseRegistry: MarkerRegistry = {
  prefixes: {
    '^': smallCapsHandler,
    '=': bareValueHandler,
    '$': introduceHandler,
    '!': literalInlineHandler,
    '':  plainReferenceHandler,
  },
};

/** Substitute every `{{...}}` marker in `body` using legalese's marker
 *  policies. Returns plain markdown — pipe to pandoc downstream. */
export function substituteMarkers(
  body: string,
  opts: { schema?: Schema; values?: Record<string, unknown> } = {},
): string {
  return markdslSubstitute(body, legaleseRegistry, {
    schema: opts.schema,
    values: opts.values ?? {},
  });
}
