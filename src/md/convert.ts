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
import { mergeValues, schemaDefaults, missingRequired, termLabel, termLong } from './values';
import type { Schema } from './types';

/** Resolve `{{key}}` plain-reference markers in a title string. Strips
 *  $/!/article-prefix decorators (titles take the bare label, not the
 *  introduce/literal/article forms). Multi-line via "\n" passes through.
 *
 *  All-caps marker (`{{COMPANY}}`) uppercases the substituted text — useful
 *  for title-style headings that want the company name in caps regardless
 *  of how it's stored in values/schema. */
function substituteTitleMarkers(
  title: string,
  schema: Schema | undefined,
  values: Record<string, unknown>,
): string {
  return title.replace(/\{\{([^}]+)\}\}/g, (_, raw: string) => {
    let inner = raw.trim();
    if (inner.startsWith('$') || inner.startsWith('!') || inner.startsWith('^')) {
      inner = inner.slice(1).trim();
    }
    const articleMatch = inner.match(/^(the|a|an)_/i);
    if (articleMatch) inner = inner.slice(articleMatch[0].length);
    const lookupKey = inner.toLowerCase();
    const allCaps = /^[A-Z][A-Z0-9_]*$/.test(inner);
    // Prefer runtime value (deal-specific), then schema.long (template-baked
    // expansion), then the bare label.
    const v = values[lookupKey];
    let resolved: string;
    if (typeof v === 'string' && v.trim() !== '') resolved = v;
    else resolved = termLong(lookupKey, schema) ?? termLabel(lookupKey, schema);
    return allCaps ? resolved.toUpperCase() : resolved;
  });
}

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

  // Pre-process: expand collapsed empty Div fences `::: {.class} :::` into
  // the two-line form pandoc requires. Linters that auto-format markdown
  // often pull short fences onto one line; this keeps `::: {.gap} :::` etc.
  // working as expected.
  const preprocessed = body.replace(
    /^(\s*):::\s*(\{[^}]+\})\s+:::\s*$/gm,
    '$1::: $2\n$1:::',
  );
  const ast = runPandoc(preprocessed);
  const ctx = {
    baseDir: opts.baseDir ?? process.cwd(),
    schema,
    indent: meta.indent === true,
  };
  const docBody = ast.blocks.flatMap((blk) => blockToDocBuilder(blk, values, ctx));

  const output = opts.output ?? meta.output;
  if (!output) {
    throw new Error('No output path: pass opts.output or set front-matter `output:`');
  }

  const rawTitle = opts.title ?? meta.title;
  const title = rawTitle ? substituteTitleMarkers(rawTitle, schema, values) : undefined;

  return build({
    title,
    output,
    body: docBody,
  });
}
