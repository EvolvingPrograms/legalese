// Top-level: markdown source string -> .docx file on disk.
//
// Output path resolution lives in the CLI (scripts/md-to-docx.js); this layer
// just accepts a final `output` override or reads the front-matter `output:`.

import { splitFrontMatter } from './front-matter.js';
import { runPandoc } from './pandoc.js';
import { blockToDocBuilder } from './blocks.js';
import { build } from '../build.js';

/**
 * @param {string} srcText
 * @param {{ output?: string, title?: string }} [opts]
 *   `output` overrides the front-matter `output:` field.
 *   `title` overrides the front-matter `title:` field.
 * @returns {Promise<string>}
 */
export function convertMarkdown(srcText, opts = {}) {
  const { meta, body } = splitFrontMatter(srcText);
  const ast = runPandoc(body);
  const values = /** @type {Record<string, unknown>} */ (meta.values || {});
  const docBody = ast.blocks.flatMap(blk => blockToDocBuilder(blk, values));
  const output = opts.output ?? meta.output;
  if (!output) {
    throw new Error('No output path: pass opts.output or set front-matter `output:`');
  }
  return build({
    title: opts.title ?? meta.title,
    output,
    body: docBody,
  });
}
