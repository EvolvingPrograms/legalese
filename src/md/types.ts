// Legalese-specific types. The generic ones (PandocAst/Block/Inline,
// Schema, SchemaEntry, FrontMatter base) come from markdsl. Anything
// here is either docx-rendering-specific (DocStyle, ConvertCtx, …) or
// extends the markdsl FrontMatter with legalese fields.

import type { Schema, FrontMatter as MarkdslFrontMatter } from 'markdsl';

export type { PandocAst, PandocBlock, PandocInline } from 'markdsl';
export type { Schema, SchemaEntry } from 'markdsl';

/** Context passed to pandoc block parsers that need filesystem access. */
export interface ParseCtx {
  baseDir: string;
}

/** Context passed to the top-level block converter. */
export interface ConvertCtx {
  baseDir: string;
  schema?: Schema;
  /** When true, every body paragraph gets a first-line indent (legal block
   *  style). Per-paragraph Div attributes (`::: {.indent}`) compose with this. */
  indent?: boolean;
  /** Body first-line indent in twips. Default 540 — matches the top-level
   *  list body indent so paragraph + list bodies share the same left edge. */
  bodyIndent?: number;
  /** Twips of breathing room emitted by `::: {.gap}` blocks. Default 240. */
  gap?: number;
  /** Body paragraph spacing — overrides PARA_SPACING for plain prose
   *  paragraphs. Doesn't affect table cells or list items. */
  paraSpacing?: { before?: number; after?: number; line?: number };
  /** Document font, sourced from `style.font:` in front-matter. Headings
   *  apply this directly to each TextRun so the `w:rFonts` lands on the
   *  run, not just the style — Word's theme-major-font reference
   *  otherwise wins for built-in heading styles in some renderers
   *  (notably DocuSign). */
  font?: string;
}

/** Style overrides. All optional; fields not set fall back to house defaults.
 *  Set in front-matter under `style:`. Sizes are in twips unless noted
 *  (1440 twips = 1"). Font sizes are in points. */
export interface DocStyle {
  /** Font family name (e.g. "Times New Roman", "Garamond", "EB Garamond").
   *  The font must be installed where the doc is opened, or Word will
   *  substitute. Default "Times New Roman". */
  font?: string;
  /** Body font size in points. Default 12. */
  size?: number;
  /** Heading 1 font size in points. Default 14. */
  h1_size?: number;
  /** Heading 2 font size in points. Default 12. */
  h2_size?: number;

  /** Page margins. Each side in twips OR a single number that applies to
   *  all sides. Default 1440 (1") on all sides. */
  margin?: number | { top?: number; right?: number; bottom?: number; left?: number };

  /** Body paragraph spacing. */
  spacing?: {
    /** Twips before each paragraph. Default 120. */
    before?: number;
    /** Twips after each paragraph. Default 120. */
    after?: number;
    /** Line height in 240ths (240 = single, 360 = 1.5, 480 = double).
     *  Default 360 (1.5 lines). */
    line?: number;
  };

  list?: {
    /** Top-level numbered list: marker→body horizontal distance, in twips.
     *  Default 540 (~0.375"). */
    indent?: number;
    /** Lettered sub-list: body indent in twips. Default 900. */
    sub_indent?: number;
    /** Lettered sub-list: marker→body distance. Default 360. */
    sub_hanging?: number;
    /** Render top-level numbers bold (matches a `**Title.**` lead-in).
     *  Default true. Set false for plain numbering. */
    bold_marker?: boolean;
  };
  body?: {
    /** First-line indent (twips) applied when document-level `indent: true`
     *  or a `::: {.indent}` Div is in effect. Default 540 (~0.375"). */
    indent?: number;
  };
  /** Title (H1) styling overrides. */
  title?: {
    /** Title alignment. Default 'center'. */
    alignment?: 'left' | 'center' | 'right' | 'justified';
  };

  /** Vertical breathing room produced by `::: {.gap}` blocks. Empty
   *  `::: {.gap} :::` emits a blank paragraph with this much before/after
   *  spacing; non-empty `{.gap}` adds `before` (× 2) to the first child
   *  paragraph. Default 240 twips. */
  gap?: number;

  /** Multi-column page layout (academic-journal style). Supply a number
   *  for the simple "N equal columns" case (default 720-twip gap), or an
   *  object for full control. Applies document-wide. */
  columns?: number | {
    count: number;
    /** Gap between columns in twips. Default 720 (~0.5"). */
    space?: number;
    /** Render a vertical separator line between columns. */
    separate?: boolean;
    /** All columns same width. Default true. */
    equalWidth?: boolean;
  };
}

/** Legalese front-matter: extends markdsl's base with title/output/indent/style. */
export interface FrontMatter extends MarkdslFrontMatter {
  title?: string;
  output?: string;
  /** Document-level first-line indent on every body paragraph (legal block
   *  style). Equivalent to wrapping the entire body in `::: {.indent}`. */
  indent?: boolean;
  /** Per-document style overrides. */
  style?: DocStyle;
}
