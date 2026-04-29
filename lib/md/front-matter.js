// YAML front matter splitter. Returns { meta, body }; meta is `{}` when missing.

import yaml from 'js-yaml';

/**
 * @typedef {{
 *   title?: string,
 *   output?: string,
 *   values?: Record<string, unknown>,
 *   [k: string]: unknown,
 * }} FrontMatter
 */

/**
 * @param {string} src
 * @returns {{ meta: FrontMatter, body: string }}
 */
export function splitFrontMatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: src };
  const meta = /** @type {FrontMatter} */ (yaml.load(m[1]) || {});
  return { meta, body: m[2] };
}
