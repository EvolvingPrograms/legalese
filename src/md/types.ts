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
  schema?: Schema;
}

/** Schema entry for a single value — either a bare type alias or a full descriptor. */
export type SchemaEntry =
  | string
  | {
      type?: string;
      required?: boolean;
      default?: unknown;
      /** Short-form label used by the defined-term marker. Defaults to snake_case → Title Case. */
      term?: string;
      /** Long-form expansion used by `{{$key}}` introductions when no value is set. */
      long?: string;
      /** Article used for singular references and `{{$key}}` introductions.
       *    true   → "the" (default)
       *    false  → none (proper-noun: `(*“Term”*)`)
       *    string → use this article verbatim (e.g. `"a"` → `(a *“Term”*)`,
       *             `"an"` for vowel-sound singulars) */
      article?: boolean | string;
      /** Article used for plural references when the singular article doesn't fit
       *  ("a Recording" but "the Recordings"). Falls back to `article` if unset. */
      plural_article?: boolean | string;
      /** Explicit plural label for irregulars ("Person" → "People"). Defaults to common English rules. */
      plural?: string;
      description?: string;
    };

/** Map of value keys to schema entries declared in front-matter `schema:`. */
export type Schema = Record<string, SchemaEntry>;

/** Parsed YAML front matter. Open-ended so callers can add document-specific keys. */
export interface FrontMatter {
  title?: string;
  output?: string;
  values?: Record<string, unknown>;
  schema?: Schema;
  [k: string]: unknown;
}
