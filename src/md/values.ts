// Legalese-specific value helpers. The generic readers (mergeValues,
// schemaDefaults, missingRequired, parseSetFlag, termLabel, fieldLabel,
// termDef, termArticle, deriveLabel, smartLabel) live in markdsl; we
// re-export them here so existing call sites keep working.
//
// Only `parseValuesYaml` stays legalese-side: it pulls in js-yaml,
// which markdsl avoids to keep its core zero-runtime-dep for browser.

import yaml from 'js-yaml';
import type { Values } from 'markdsl';

export type { Values } from 'markdsl';
export {
  mergeValues,
  schemaDefaults,
  missingRequired,
  parseSetFlag,
  termLabel,
  fieldLabel,
  termDef,
  termArticle,
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
