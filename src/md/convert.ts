// Top-level: markdown source string -> .docx file on disk.
//
// Output path resolution lives in the CLI (scripts/md-to-docx.ts); this layer
// just accepts a final `output` override or reads the front-matter `output:`.
//
// Values flow: caller passes `values` (already merged from CLI/file/stdin in
// the CLI), front-matter `values:` and `schema[key].default` are merged
// underneath. Caller > front-matter > schema-default.

import { build } from '@/lib/build';

import { splitFrontMatter } from './front-matter';
import { runPandoc } from './pandoc';
import { blockToDocBuilder } from './blocks';
import { mergeValues, schemaDefaults, missingRequired } from './values';
import type { Schema } from './types';

export interface ConvertOptions {
  output?: string;
  title?: string;
  baseDir?: string;
  /** Caller-supplied values that override front-matter `values:` and schema defaults. */
  values?: Record<string, unknown>;
  /** Throw if any `schema` keys flagged required are missing from the merged values. */
  strict?: boolean;
}

export function convertMarkdown(srcText: string, opts: ConvertOptions = {}): Promise<string> {
  const { meta, body } = splitFrontMatter(srcText);
  const schema = meta.schema as Schema | undefined;

  const values = mergeValues(
    schemaDefaults(schema),
    meta.values as Record<string, unknown> | undefined,
    opts.values,
  );

  if (opts.strict) {
    const missing = missingRequired(values, schema);
    if (missing.length) {
      throw new Error(`Missing required values: ${missing.join(', ')}`);
    }
  }

  const ast = runPandoc(body);
  const ctx = { baseDir: opts.baseDir ?? process.cwd(), schema };
  const docBody = ast.blocks.flatMap((blk) => blockToDocBuilder(blk, values, ctx));

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
