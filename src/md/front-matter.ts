// YAML front-matter splitter. Returns { meta, body }; meta is `{}` when absent.

import type { FrontMatter } from './types';
import yaml from 'js-yaml';

/** Split a markdown source string into its front matter and body.
 *  Returns an empty `meta` object when no front matter is present. */
export function splitFrontMatter(src: string): { meta: FrontMatter; body: string } {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: src };

  const meta = (yaml.load(m[1]!) ?? {}) as FrontMatter;
  return { meta, body: m[2]! };
}
