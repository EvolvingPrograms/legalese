// Value-source merging and schema lookup for templated markdown documents.
//
// A document's values come from up to four sources, in precedence order
// (highest first):
//   1. CLI --set key=value flags
//   2. CLI --values-file (or stdin) — flat YAML map
//   3. front-matter `values:` (defaults baked into the template)
//   4. `schema[key].default` (per-key fallback)
//
// `schema:` declares the shape of the values: each key maps to either a bare
// type alias ("string", "date", …) or an object with type/required/default/
// term/description. The `term` field overrides the auto-derived defined-term
// label (snake_case → Title Case).

import yaml from 'js-yaml';

export type Values = Record<string, unknown>;
import type { Schema, SchemaEntry } from './types';

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

/** Parse a single CLI `--set key=value` argument. */
export function parseSetFlag(arg: string): [string, string] {
  const eq = arg.indexOf('=');
  if (eq < 0) throw new Error(`--set requires key=value, got: ${arg}`);
  return [arg.slice(0, eq).trim(), arg.slice(eq + 1)];
}

/** Merge value sources in precedence order; later sources win. */
export function mergeValues(...sources: (Values | undefined)[]): Values {
  return Object.assign({}, ...sources.filter(Boolean));
}

/** Pull `default` fields out of a schema as a Values map. */
export function schemaDefaults(schema: Schema | undefined): Values {
  if (!schema) return {};
  const out: Values = {};
  for (const [key, entry] of Object.entries(schema)) {
    if (typeof entry === 'object' && entry !== null && 'default' in entry) {
      out[key] = entry.default;
    }
  }
  return out;
}

/** Return the keys flagged `required: true` whose merged value is missing/empty. */
export function missingRequired(merged: Values, schema: Schema | undefined): string[] {
  if (!schema) return [];
  const missing: string[] = [];
  for (const [key, entry] of Object.entries(schema)) {
    if (typeof entry !== 'object' || entry === null) continue;
    if (!entry.required) continue;
    const v = merged[key];
    if (v == null || v === '') missing.push(key);
  }
  return missing;
}

/** snake_case → Title Case. `assignment_date` → `Assignment Date`. */
export function deriveLabel(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Convert ASCII apostrophes to curly so term labels read consistently with
 *  pandoc's smart-quoted body prose. YAML strings can't carry typographic
 *  apostrophes ergonomically, so authors write `Publisher's Share` and we
 *  upgrade it to `Publisher’s Share` at render time. */
export function smartLabel(s: string): string {
  return s.replace(/'/g, '’');
}

// Apply common English pluralization to an already-displayable label.
function pluralizeLabel(label: string): string {
  if (/[^aeiouy]y$/i.test(label)) return label.slice(0, -1) + 'ies';
  if (/(s|x|z|ch|sh)$/i.test(label)) return label + 'es';
  return label + 's';
}

// Try to resolve a schema entry by treating `key` as a plural and looking up
// its singular form, or as a singular and looking up its plural. Returns
// { entry, asPlural } where `asPlural` is true if `key` is the plural side
// of the resolved relationship (so the caller knows to render the plural label).
function resolveBidirectional(key: string, schema: Schema): { entry: SchemaEntry; asPlural: boolean } | undefined {
  // Treat key as plural → try common stems.
  const stems: string[] = [];
  if (key.endsWith('ies')) stems.push(key.slice(0, -3) + 'y');
  if (key.endsWith('es'))  stems.push(key.slice(0, -2));
  if (key.endsWith('s'))   stems.push(key.slice(0, -1));
  for (const s of stems) {
    const e = schema[s];
    if (e !== undefined) return { entry: e, asPlural: true };
  }
  // Treat key as singular → try +s (caller wants plural rendering of e.term).
  const e = schema[key + 's'];
  if (e !== undefined) return { entry: e, asPlural: false };
  return undefined;
}

/** Resolve the display label for a defined-term reference. Tries:
 *  1. Direct schema hit (uses entry.term, smart-quoted).
 *  2. Bidirectional lookup — sibling singular/plural in schema:
 *     `parties` finds `party` (renders the plural of party.term);
 *     `recording` finds `recordings` (renders the singular of recordings.term).
 *  3. Falls back to snake_case → Title Case derivation. */
export function termLabel(key: string, schema: Schema | undefined): string {
  if (schema) {
    const direct = schema[key];
    if (typeof direct === 'object' && direct !== null && direct.term) return smartLabel(direct.term);
    if (typeof direct === 'string') return deriveLabel(key);

    const bi = resolveBidirectional(key, schema);
    if (bi) {
      const { entry, asPlural } = bi;
      if (typeof entry === 'object' && entry !== null) {
        const baseTerm = entry.term ? smartLabel(entry.term) : null;
        if (asPlural) {
          // `key` is the plural side; entry stores the singular.
          if (entry.plural) return smartLabel(entry.plural);
          return pluralizeLabel(baseTerm ?? deriveLabel(key.replace(/(ies|es|s)$/, '')));
        } else {
          // `key` is the singular side; entry stores the plural.
          // Strip the trailing 's' off entry.term to get the singular display.
          if (baseTerm) return baseTerm.replace(/ies$/, 'y').replace(/es$/, '').replace(/s$/, '');
        }
      }
    }
  }
  return deriveLabel(key);
}

/** Label for a fields-block row when only the key is given.
 *  Resolution: schema.description → schema.term → derived. */
export function fieldLabel(key: string, schema: Schema | undefined): string {
  const entry: SchemaEntry | undefined = schema?.[key];
  if (typeof entry === 'object' && entry !== null) {
    if (entry.description) return entry.description;
    if (entry.term) return smartLabel(entry.term);
  }
  return deriveLabel(key);
}

function readArticle(field: boolean | string | undefined): string | null | undefined {
  if (field === false) return null;
  if (typeof field === 'string') return field;
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

/** Definition expansion for `{{$key}}` introductions when there's no runtime value. */
export function termDef(key: string, schema: Schema | undefined): string | undefined {
  const entry: SchemaEntry | undefined = schema?.[key];
  if (typeof entry === 'object' && entry !== null && entry.def) return smartLabel(entry.def);
  return undefined;
}
