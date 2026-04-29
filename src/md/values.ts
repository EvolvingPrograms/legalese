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

/** Resolve the display label for a defined-term reference: schema override, else derived. */
export function termLabel(key: string, schema: Schema | undefined): string {
  const entry: SchemaEntry | undefined = schema?.[key];
  if (typeof entry === 'object' && entry !== null && entry.term) return smartLabel(entry.term);
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

/** Whether a defining marker should emit "the" before the term. Default true. */
export function termArticle(key: string, schema: Schema | undefined): boolean {
  const entry: SchemaEntry | undefined = schema?.[key];
  if (typeof entry === 'object' && entry !== null && entry.article === false) return false;
  return true;
}

/** Long-form expansion for `{{$key}}` introductions when there's no runtime value. */
export function termLong(key: string, schema: Schema | undefined): string | undefined {
  const entry: SchemaEntry | undefined = schema?.[key];
  if (typeof entry === 'object' && entry !== null && entry.long) return smartLabel(entry.long);
  return undefined;
}
