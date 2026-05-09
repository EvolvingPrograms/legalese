// Top-level: markdown source string -> .docx file on disk.
//
// Output path resolution lives in the CLI (scripts/legalese.ts); this layer
// just accepts a final `output` override or reads the front-matter `output:`.
//
// Values flow: caller passes `values` (already merged from CLI/file/stdin in
// the CLI), front-matter `values:` and `schema[key].default` are merged
// underneath. Caller > front-matter > schema-default.

import fs from 'node:fs';

import { build, buildToBuffer } from '@/lib/build';
import type { BodyEntry } from '@/types';

import { splitFrontMatter } from './front-matter';
import { blockToDocBuilder } from './blocks';
import { substituteMarkers } from './substitute';
import { mergeValues, schemaDefaults, missingRequired } from './values';
import type { FrontMatter, PandocAst, PandocBlock, Schema } from './types';

// System-pandoc default parser. Loaded lazily so the browser entry point
// (which always passes `parse: runPandocWasm`) doesn't statically pull
// `node:child_process` into the bundler graph.
async function defaultParse(body: string): Promise<PandocAst> {
  const { runPandoc } = await import('./pandoc');
  return runPandoc(body);
}

// Title markers go through the same `substituteMarkers` pipeline as body
// prose, so `{{=COMPANY}}` substitutes the value uppercased and `{{Term}}`
// resolves to the term label — same semantics regardless of position.

/** Markdown → Pandoc AST. The default uses the system `pandoc` binary
 *  (Node only). Pass `runPandocWasm` from `@/md/pandoc-wasm` — or import
 *  from `legalese/browser` — to use the WASM build instead. */
export type ParseFn = (body: string) => PandocAst | Promise<PandocAst>;

/** Output formats for `convertMarkdown`. */
export type ConvertFormat = 'docx' | 'json' | 'markdown';

export interface ConvertOptions {
  /** Output format. Default: `'docx'`. */
  format?: ConvertFormat;
  /** Optional output path. If set, the result is written to disk and the
   *  function resolves to the path string. If omitted, the function
   *  resolves to the in-memory result (Buffer for docx, DocumentJson for
   *  json, string for markdown). */
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

/** Structured JSON output for interactive UIs. The blocks have all
 *  `{{...}}` markers already resolved; consumers walk the AST to render
 *  the document and read `schema` / `missing` / `values` to drive an
 *  input form. */
export interface DocumentJson {
  /** Front-matter as parsed (title, schema, style, etc.). */
  meta: FrontMatter;
  /** Marker-resolved Pandoc AST blocks. */
  blocks: PandocBlock[];
  /** Merged values: caller > front-matter > schema defaults. */
  values: Record<string, unknown>;
  /** Schema as declared in front-matter, undefined if none. */
  schema?: Schema;
  /** Required schema keys with no value supplied. */
  missing: string[];
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
    font: style.font as string | undefined,
  };
  const docBody: BodyEntry[] = ast.blocks.flatMap((blk) => blockToDocBuilder(blk, values, ctx));

  const rawTitle = opts.title ?? meta.title;
  const title = rawTitle ? substituteMarkers(rawTitle, { schema, values }) : undefined;

  return { title, body: docBody, style: meta.style as Record<string, unknown> | undefined, output: meta.output };
}

/** Render markdown source to a .docx in memory and return the raw bytes —
 *  no filesystem access. Use in the browser, serverless handlers, or any
 *  place you want the document as a Buffer/Blob rather than a file. */
export async function convertMarkdownToBuffer(srcText: string, opts: ConvertOptions = {}): Promise<Buffer> {
  const { title, body, style } = await srcToDocBody(srcText, opts);
  return buildToBuffer({ title, body, style });
}

// — Unified convertMarkdown with format + optional output —
//
// Behavior:
//   format: 'docx'      → Buffer (no output) | path string (with output)
//   format: 'json'      → DocumentJson (no output) | path string (with output, JSON file)
//   format: 'markdown'  → string (no output) | path string (with output, .md file)
//
// `format` defaults to 'docx' for backwards compatibility with the
// pre-format API.

export function convertMarkdown(
  srcText: string,
  opts: ConvertOptions & { format: 'json'; output: string },
): Promise<string>;
export function convertMarkdown(
  srcText: string,
  opts: ConvertOptions & { format: 'json' },
): Promise<DocumentJson>;
export function convertMarkdown(
  srcText: string,
  opts: ConvertOptions & { format: 'markdown'; output: string },
): Promise<string>;
export function convertMarkdown(
  srcText: string,
  opts: ConvertOptions & { format: 'markdown' },
): Promise<string>;
export function convertMarkdown(
  srcText: string,
  opts: ConvertOptions & { format?: 'docx'; output: string },
): Promise<string>;
export function convertMarkdown(
  srcText: string,
  opts?: ConvertOptions & { format?: 'docx' },
): Promise<Buffer | string>;
export async function convertMarkdown(
  srcText: string,
  opts: ConvertOptions = {},
): Promise<Buffer | string | DocumentJson> {
  const format = opts.format ?? 'docx';

  if (format === 'json' || format === 'markdown') {
    const { meta, body } = splitFrontMatter(srcText);
    const schema = meta.schema as Schema | undefined;
    const values = mergeValues(
      schemaDefaults(schema),
      meta.values as Record<string, unknown> | undefined,
      opts.values,
    );
    if (opts.strict) {
      const m = missingRequired(values, schema);
      if (m.length) throw new Error(`Missing required values: ${m.join(', ')}`);
    }
    const resolvedBody = substituteMarkers(body, { schema, values });

    if (format === 'markdown') {
      // Reassemble front-matter + body so callers get a self-contained
      // document. Drop `output:` since it doesn't apply to a string result.
      const out = serializeFrontMatter(meta) + resolvedBody;
      if (opts.output) {
        fs.writeFileSync(opts.output, out);
        return opts.output;
      }
      return out;
    }

    // format === 'json'
    const parse = opts.parse ?? defaultParse;
    const ast = await parse(resolvedBody);
    const result: DocumentJson = {
      meta,
      blocks: ast.blocks,
      values,
      schema,
      missing: missingRequired(values, schema),
    };
    if (opts.output) {
      fs.writeFileSync(opts.output, JSON.stringify(result, null, 2));
      return opts.output;
    }
    return result;
  }

  // format === 'docx'
  const { title, body, style, output: metaOutput } = await srcToDocBody(srcText, opts);
  const output = opts.output ?? metaOutput;
  if (output) return build({ title, output, body, style });
  return buildToBuffer({ title, body, style });
}

/** Re-emit YAML front-matter from the parsed object. Best-effort — uses
 *  js-yaml when available, falls back to a minimal manual serializer for
 *  environments that don't bundle js-yaml (browser). */
function serializeFrontMatter(meta: FrontMatter): string {
  const keys = Object.keys(meta).filter((k) => meta[k] !== undefined);
  if (keys.length === 0) return '';
  // Lazy import — js-yaml is a dev dep but works at runtime when present.
  let yaml: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jsYaml = require('js-yaml');
    yaml = jsYaml.dump(meta, { lineWidth: -1 });
  } catch {
    // Manual fallback — only handles top-level scalar / object keys, good
    // enough for round-tripping front-matter that came from this library.
    yaml = keys.map((k) => `${k}: ${JSON.stringify(meta[k])}`).join('\n') + '\n';
  }
  return `---\n${yaml}---\n\n`;
}
