// Top-level: markdown source string -> .docx file on disk (or .json /
// resolved markdown). Thin wrapper around markdsl/docx — the docx
// pipeline lives there now; legalese supplies the configuration:
//
//   * fenced handlers (fields / sig / grid / panel)
//   * marker emitter (the 5-prefix legalese grammar)
//   * resolveText (title interpolation via the same markdsl substitute
//     that handles fenced-block strings)

import fs from 'node:fs';

import {
  splitFrontMatter,
  runPandoc,
  mergeValues,
  schemaDefaults,
  missingRequired,
  type PandocBlock,
  type Schema,
} from 'markdsl';
import {
  renderMarkdown as renderMarkdownDocx,
  renderMarkdownToBuffer as renderMarkdownToBufferDocx,
  spacer,
  type DocxFrontMatter as FrontMatter,
  type DocxRenderConfig,
  type ParseFn,
  type RenderMarkdownOptions,
} from 'markdsl/docx';

import { parseFieldsBlock, parseSigBlock, parseGridBlock, parsePanelBlock } from './fenced';
import { legaleseMarkerEmitter } from './marker-emitter';
import { substituteMarkers } from './substitute';

export type { ParseFn };

/** Output formats for `convertMarkdown`. */
export type ConvertFormat = 'docx' | 'json' | 'markdown';

export interface ConvertOptions {
  /** Output format. Default: `'docx'`. */
  format?: ConvertFormat;
  /** Optional output path. Writes to disk and resolves to the path
   *  string; otherwise returns the in-memory result. */
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

/** Structured JSON output for interactive UIs. */
export interface DocumentJson {
  meta: FrontMatter;
  blocks: PandocBlock[];
  values: Record<string, unknown>;
  schema?: Schema;
  missing: string[];
}

// Legalese's docx config: the 5-prefix marker grammar + the four
// fenced blocks + title text interpolation. Fenced parsers wrap their
// table return with surrounding spacers so docx layout breathes
// correctly above and below.
const legaleseConfig: DocxRenderConfig = {
  markerEmitter: legaleseMarkerEmitter,
  fencedHandlers: {
    fields: (content, values, ctx) => [spacer(), parseFieldsBlock(content, values, ctx.schema), spacer()],
    sig:    (content, values, ctx) => parseSigBlock(content, values, ctx.schema),
    grid:   (content, values, ctx) => parseGridBlock(content, ctx, values, ctx.schema),
    panel:  (content, values, ctx) => parsePanelBlock(content, values, ctx.schema),
  },
  resolveText: (text, ctx) => substituteMarkers(text, { schema: ctx.schema, values: ctx.values }),
};

function renderOpts(opts: ConvertOptions): RenderMarkdownOptions {
  return {
    config: legaleseConfig,
    parse: opts.parse,
    values: opts.values,
    strict: opts.strict,
    title: opts.title,
    baseDir: opts.baseDir,
  };
}

/** Render markdown source to a .docx in memory and return the raw bytes. */
export async function convertMarkdownToBuffer(
  srcText: string,
  opts: ConvertOptions = {},
): Promise<Buffer> {
  return renderMarkdownToBufferDocx(srcText, renderOpts(opts));
}

// — Unified convertMarkdown with format + optional output —
//
// Behavior:
//   format: 'docx'      → Buffer (no output) | path string (with output)
//   format: 'json'      → DocumentJson (no output) | path string (with output, JSON file)
//   format: 'markdown'  → string (no output) | path string (with output, .md file)

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
    const { meta, body } = splitFrontMatter<FrontMatter>(srcText);
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
    const parse = opts.parse ?? runPandoc;
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
  return renderMarkdownDocx(srcText, { ...renderOpts(opts), output: opts.output });
}

/** Re-emit YAML front-matter from the parsed object. Best-effort — uses
 *  js-yaml when available, falls back to a minimal manual serializer for
 *  environments that don't bundle js-yaml (browser). */
function serializeFrontMatter(meta: FrontMatter): string {
  const keys = Object.keys(meta).filter((k) => meta[k] !== undefined);
  if (keys.length === 0) return '';
  let yaml: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jsYaml = require('js-yaml');
    yaml = jsYaml.dump(meta, { lineWidth: -1 });
  } catch {
    yaml = keys.map((k) => `${k}: ${JSON.stringify(meta[k])}`).join('\n') + '\n';
  }
  return `---\n${yaml}---\n\n`;
}
