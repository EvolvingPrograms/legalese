// Top-level: markdown source string -> .docx file on disk.
//
// Output path resolution lives in the CLI (scripts/legalese.ts); this layer
// just accepts a final `output` override or reads the front-matter `output:`.
//
// Values flow: caller passes `values` (already merged from CLI/file/stdin in
// the CLI), front-matter `values:` and `schema[key].default` are merged
// underneath. Caller > front-matter > schema-default.

import { build, buildToBuffer } from '@/lib/build';
import type { BodyEntry } from '@/types';

import { splitFrontMatter } from './front-matter';
import { blockToDocBuilder } from './blocks';
import { mergeValues, schemaDefaults, missingRequired, termLabel, termDef } from './values';
import type { PandocAst, Schema } from './types';

// System-pandoc default parser. Loaded lazily so the browser entry point
// (which always passes `parse: runPandocWasm`) doesn't statically pull
// `node:child_process` into the bundler graph.
async function defaultParse(body: string): Promise<PandocAst> {
  const { runPandoc } = await import('./pandoc');
  return runPandoc(body);
}

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
    // Prefer runtime value (deal-specific), then schema.def (template-baked
    // expansion), then the bare label.
    const v = values[lookupKey];
    let resolved: string;
    if (typeof v === 'string' && v.trim() !== '') resolved = v;
    else resolved = termDef(lookupKey, schema) ?? termLabel(lookupKey, schema);
    return allCaps ? resolved.toUpperCase() : resolved;
  });
}

/** Markdown → Pandoc AST. The default uses the system `pandoc` binary
 *  (Node only). Pass `runPandocWasm` from `@/md/pandoc-wasm` — or import
 *  from `legalese/browser` — to use the WASM build instead. */
export type ParseFn = (body: string) => PandocAst | Promise<PandocAst>;

export interface ConvertOptions {
  output?: string;
  title?: string;
  baseDir?: string;
  /** Caller-supplied values that override front-matter `values:` and schema defaults. */
  values?: Record<string, unknown>;
  /** Throw if any `schema` keys flagged required are missing from the merged values. */
  strict?: boolean;
  /** Markdown parser. Defaults to system `pandoc`. Inject `runPandocWasm`
   *  for browser/no-system-pandoc use; the `legalese/browser` entry point
   *  pre-wires this. */
  parse?: ParseFn;
}

/** Internal: source string → ready-to-render `BodyEntry[]` plus the
 *  resolved title and style. Shared by both the Buffer-returning and
 *  filesystem-writing entry points. */
async function srcToDocBody(srcText: string, opts: ConvertOptions) {
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
  const parse = opts.parse ?? defaultParse;
  const ast = await parse(preprocessed);
  const style = (meta.style ?? {}) as Record<string, any>;
  const ctx = {
    baseDir: opts.baseDir ?? (typeof process !== 'undefined' ? process.cwd() : '/'),
    schema,
    indent: meta.indent === true,
    bodyIndent: style.body?.indent as number | undefined,
    gap: style.gap as number | undefined,
    paraSpacing: style.spacing as
      | { before?: number; after?: number; line?: number }
      | undefined,
  };
  const docBody: BodyEntry[] = ast.blocks.flatMap((blk) => blockToDocBuilder(blk, values, ctx));

  const rawTitle = opts.title ?? meta.title;
  const title = rawTitle ? substituteTitleMarkers(rawTitle, schema, values) : undefined;

  return { title, body: docBody, style: meta.style as Record<string, unknown> | undefined, output: meta.output };
}

/** Render markdown source to a .docx in memory and return the raw bytes —
 *  no filesystem access. Use in the browser, serverless handlers, or any
 *  place you want the document as a Buffer/Blob rather than a file. */
export async function convertMarkdownToBuffer(srcText: string, opts: ConvertOptions = {}): Promise<Buffer> {
  const { title, body, style } = await srcToDocBody(srcText, opts);
  return buildToBuffer({ title, body, style });
}

/** Render markdown source to a .docx on disk. Resolves to the output path. */
export async function convertMarkdown(srcText: string, opts: ConvertOptions = {}): Promise<string> {
  const { title, body, style, output: metaOutput } = await srcToDocBody(srcText, opts);
  const output = opts.output ?? metaOutput;
  if (!output) {
    throw new Error('No output path: pass opts.output or set front-matter `output:`');
  }
  return build({ title, output, body, style });
}
