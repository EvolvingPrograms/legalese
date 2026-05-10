// Legalese-specific value helpers. Generic readers (mergeValues,
// termLabel, etc.) live in markdsl — import them from there directly.
//
// Only `parseValuesYaml` stays here: it pulls in js-yaml, which markdsl
// avoids to keep its core zero-runtime-dep for browser.

import yaml from 'js-yaml';
import type { Values } from 'markdsl';

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
