// Top-level: markdown source string -> .docx file on disk.
//
// Output path resolution lives in the CLI (scripts/md-to-docx.js); this layer
// just accepts a final `output` override or reads the front-matter `output:`.

import { splitFrontMatter } from './front-matter';
import { runPandoc } from './pandoc';
import { blockToDocBuilder } from './blocks';
import { build } from '@/lib/build';

export function convertMarkdown(
  srcText: string,
  opts: { output?: string; title?: string; baseDir?: string } = {},
): Promise<string> {
  const { meta, body } = splitFrontMatter(srcText);
  const ast = runPandoc(body);
  const values = (meta.values || {}) as Record<string, unknown>;
  const ctx = { baseDir: opts.baseDir ?? process.cwd() };
  const docBody = ast.blocks.flatMap(blk => blockToDocBuilder(blk, values, ctx));
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
