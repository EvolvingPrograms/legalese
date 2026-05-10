// Legalese-specific value helpers. The generic ones (mergeValues,
// schemaDefaults, missingRequired, parseSetFlag, termLabel, fieldLabel,
// termDef, deriveLabel, smartLabel) live in markdsl; we re-export them
// here so existing call sites keep working.
//
// Two pieces stay legalese-side:
//   - parseValuesYaml: pulls in js-yaml, which markdsl avoids (it
//     wants a zero-runtime-dep core for browser).
//   - termArticle: reads `article` / `plural_article` to drive
//     legalese's defined-term rendering. The schema fields are part of
//     markdsl's vocabulary, but the read policy ("opt-in: returns null
//     unless schema explicitly sets `article:`") is a legalese choice.

import yaml from 'js-yaml';
import type { Schema, SchemaEntry, Values } from 'markdsl';

export type { Values } from 'markdsl';
export {
  mergeValues,
  schemaDefaults,
  missingRequired,
  parseSetFlag,
  termLabel,
  fieldLabel,
  termDef,
  deriveLabel,
  smartLabel,
} from 'markdsl';

/** Parse a flat YAML map of values. Accepts an empty string. */
export function parseValuesYaml(src: string): Values {
  if (!src.trim()) return {};
  const parsed = yaml.load(src);
  if (parsed == null) return {};
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('values YAML must be a flat map of key: value pairs');
  }
  return parsed as Values;
}

function readArticle(field: boolean | string | undefined): string | null | undefined {
  if (field === false) return null;
  if (typeof field === 'string') return field;
  return undefined;
}

// Mirrors markdsl/src/schema/lookup.ts resolveBidirectional. Kept
// inline so termArticle stays self-contained — markdsl doesn't expose
// it because the bidirectional lookup is encapsulated inside its own
// readers (termLabel etc.).
function resolveBidirectional(
  key: string,
  schema: Schema,
): { entry: SchemaEntry; asPlural: boolean } | undefined {
  const stems: string[] = [];
  if (key.endsWith('ies')) stems.push(key.slice(0, -3) + 'y');
  if (key.endsWith('es')) stems.push(key.slice(0, -2));
  if (key.endsWith('s')) stems.push(key.slice(0, -1));
  for (const s of stems) {
    const e = schema[s];
    if (e !== undefined) return { entry: e, asPlural: true };
  }
  const e = schema[key + 's'];
  if (e !== undefined) return { entry: e, asPlural: false };
  return undefined;
}

/** Article a defining marker should emit before the term. Bidirectional and
 *  plural-aware. **Opt-in: returns null unless the schema explicitly sets
 *  `article:`** — this keeps `{{agreement}}` / `{{writer}}` rendering as plain
 *  capitalized prose by default, and reserves auto-article for terms where the
 *  author wants schema-driven O(1) flips (`{{recording}}` with article "a" →
 *  flip to "an" everywhere by editing one schema field).
 *
 *    {{recording}}  → entry.article         (singular)
 *    {{recordings}} → entry.plural_article ?? entry.article  (plural)
 *    {{$recording}} → entry.article         (introducing singular)
 *  Returns:
 *    null    → no article (default, or schema.article: false)
 *    string  → that article ("a"/"an"/"the"/"such" via schema) */
export function termArticle(key: string, schema: Schema | undefined): string | null {
  if (!schema) return null;

  const direct = schema[key];
  if (typeof direct === 'object' && direct !== null) {
    const a = readArticle(direct.article);
    return a ?? null;
  }

  const bi = resolveBidirectional(key, schema);
  if (bi) {
    const { entry, asPlural } = bi;
    if (typeof entry === 'object' && entry !== null) {
      if (asPlural) {
        const pa = readArticle(entry.plural_article);
        if (pa !== undefined) return pa;
      }
      const a = readArticle(entry.article);
      if (a !== undefined) return a;
    }
  }
  return null;
}
