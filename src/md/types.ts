// Shared types for lib/md/. Single-file-only types live inline in their modules.

/** A single block node from the Pandoc JSON AST. */
export interface PandocBlock {
  t: string;
  c?: unknown;
}

/** A single inline node from the Pandoc JSON AST. */
export interface PandocInline {
  t: string;
  c?: unknown;
}

/** Top-level Pandoc JSON output. */
export interface PandocAst {
  blocks: PandocBlock[];
  'pandoc-api-version'?: number[];
  meta?: unknown;
}

/** Context passed to pandoc block parsers that need filesystem access. */
export interface ParseCtx {
  baseDir: string;
}

/** Context passed to the top-level block converter. */
export interface ConvertCtx {
  baseDir: string;
}

/** Parsed YAML front matter. Open-ended so callers can add document-specific keys. */
export interface FrontMatter {
  title?: string;
  output?: string;
  values?: Record<string, unknown>;
  [k: string]: unknown;
}
