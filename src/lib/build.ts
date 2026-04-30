/**
 * Compose and write a .docx file from a title and body entries.
 * House styles (fonts, headings, numbering) are applied here so callers
 * never need to think about them.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Document, Packer, AlignmentType, LevelFormat,
  Footer, Paragraph as DocxParagraph, TextRun, PageNumber,
} from 'docx';
import type { Paragraph, Table } from 'docx';

// `import.meta.dir` is bun-only — undefined in Node and after `bun build
// --target=node`. Use the universal ESM idiom so the bundled dist/ runs
// under Node too.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import {
  FONT, BODY_SIZE, H1_SIZE, H2_SIZE,
  PAGE, MARGIN, PARA_SPACING, SUBLIST_REF, TOPLIST_REF,
} from './defaults';
import { h1 } from '@/blocks';
import type { BodyEntry } from '@/types';

/** Per-document style overrides — front-matter `style:` block. All fields
 *  optional; missing fields fall back to house defaults. */
export interface DocStyleOpts {
  font?: string;
  size?: number;     // body font size in points (12 = 12pt)
  h1_size?: number;
  h2_size?: number;
  margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
  spacing?: { before?: number; after?: number; line?: number };
  list?: {
    indent?: number;
    sub_indent?: number;
    sub_hanging?: number;
    bold_marker?: boolean;
  };
  body?: { indent?: number };
}

/** Bundled font families (Google Fonts under OFL/Apache). Read from
 *  fonts/manifest.json at module load. The font binaries get embedded into
 *  the .docx so the document renders correctly even on systems where the
 *  font isn't installed. Resolves relative to the source file at runtime.
 *  Looks for `fonts/` first in the install directory, then in the parent
 *  (handles both `node $SKILL_DIR <doc>` and library/installed-package use). */
function loadFontManifest(): { family: string; name: string; data: Buffer }[] {
  // Walk up from this file to find a fonts/ directory.
  const candidates = [
    path.resolve(__dirname, '..', 'fonts'),         // src/lib → fonts/
    path.resolve(__dirname, '..', '..', 'fonts'),   // dist/ → fonts/
    path.resolve(process.cwd(), 'fonts'),           // CWD-relative
  ];

  for (const dir of candidates) {
    const manifestPath = path.join(dir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;

    const out: { family: string; name: string; data: Buffer }[] = [];
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      family: string; files: string[];
    }[];

    for (const fam of manifest) {
      for (const file of fam.files) {
        const tt = path.join(dir, file);
        if (fs.existsSync(tt)) {
          // docx FontOptions wants `name` for the family string. We keep
          // a separate `family` field for our own filter (every variant
          // shares one family but each variant is one entry).
          out.push({ family: fam.family, name: fam.family, data: fs.readFileSync(tt) });
        }
      }
    }
    return out;
  }
  return [];
}

const BUNDLED_FONTS = loadFontManifest();

/** Resolve margin spec into a 4-sided object. */
function resolveMargin(spec: DocStyleOpts['margin']): { top: number; right: number; bottom: number; left: number } {
  if (typeof spec === 'number') {
    return { top: spec, right: spec, bottom: spec, left: spec };
  }
  return {
    top:    spec?.top    ?? MARGIN.top,
    right:  spec?.right  ?? MARGIN.right,
    bottom: spec?.bottom ?? MARGIN.bottom,
    left:   spec?.left   ?? MARGIN.left,
  };
}

/** Write `body` (flat or nested) to `output` as a .docx; resolves to the output path. */
export const build = ({ title, output, body, style }: {
  title?: string;
  output: string;
  body: BodyEntry[];
  style?: DocStyleOpts | Record<string, unknown>;
}): Promise<string> => {
  const s  = (style ?? {}) as DocStyleOpts;
  const ls = s.list ?? {};
  const sp = s.spacing ?? {};

  // Font sizes: docx uses half-points (24 = 12pt). User input is in points.
  const FONT_FAMILY = s.font ?? FONT;
  const SIZE  = s.size    ? s.size    * 2 : BODY_SIZE;
  const H1_SZ = s.h1_size ? s.h1_size * 2 : H1_SIZE;
  const H2_SZ = s.h2_size ? s.h2_size * 2 : H2_SIZE;

  const PARA_BEFORE = sp.before  ?? PARA_SPACING.before;
  const PARA_AFTER  = sp.after   ?? PARA_SPACING.after;
  const PARA_LINE   = sp.line    ?? PARA_SPACING.line;

  const MARGINS = resolveMargin(s.margin);

  // If the requested font is one of our bundled families, embed it in the
  // .docx so the document renders correctly on systems without the font
  // installed. Word may show a "Word found unreadable content" recovery
  // prompt on open (docx-js's font-embedding emits fixed `<w:sig>` values
  // that don't match the font's actual OS/2 table); accepting the prompt
  // recovers the file cleanly. We embed only ONE file per family (the
  // regular variant) because docx-js's FontOptions API doesn't expose
  // variant flags — passing multiple files with the same name produces
  // duplicate <w:font> entries that confuse Word. Bold/italic are
  // synthesized.
  const embeddedFonts = s.font
    ? BUNDLED_FONTS
        .filter((f) => f.family === s.font)
        .slice(0, 1)
        .map(({ name, data }) => ({ name, data }))
    : [];

  const TOP_INDENT = ls.indent      ?? 540;
  const SUB_INDENT = ls.sub_indent  ?? 900;
  const SUB_HANG   = ls.sub_hanging ?? 360;
  const BOLD_NUM   = ls.bold_marker ?? true;
  const doc = new Document({
    ...(embeddedFonts.length > 0 ? { fonts: embeddedFonts } : {}),
    styles: {
      default: {
        // Default paragraph spacing is tight (single line, no before/after) —
        // appropriate for table cells. Body paragraphs and list items
        // override explicitly with their own spacing in the block builders.
        // Without this, cells inherit Word's "modern" Normal defaults
        // (~8pt after, 1.08 line) and field-table rows balloon.
        document: {
          run: { font: FONT_FAMILY, size: SIZE },
          paragraph: { spacing: { before: 0, after: 0, line: 240 } },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1',
          basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: H1_SZ, bold: true, font: FONT_FAMILY },
          paragraph: {
            spacing: { before: 240, after: 360 },
            outlineLevel: 0,
            alignment: AlignmentType.CENTER,
          },
        },
        {
          id: 'Heading2', name: 'Heading 2',
          basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: H2_SZ, bold: true, font: FONT_FAMILY },
          paragraph: {
            spacing: { before: 280, after: 120 },
            outlineLevel: 1,
            keepNext: true,
          },
        },
      ],
    },
    numbering: {
      config: [
        {
          // Lettered sub-list under a numbered top-level item.
          reference: SUBLIST_REF,
          levels: [{
            level: 0,
            format: LevelFormat.LOWER_LETTER,
            text: '(%1)',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: SUB_INDENT, hanging: SUB_HANG } } },
          }],
        },
        {
          // Top-level numbered sections: 1.   2.   3.
          reference: TOPLIST_REF,
          levels: [{
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: {
              ...(BOLD_NUM ? { run: { bold: true } } : {}),
              paragraph: { indent: { left: TOP_INDENT, hanging: TOP_INDENT } },
            },
          }],
        },
      ],
    },
    sections: [{
      properties: {
        page: { size: PAGE, margin: MARGINS },
        // Suppress page number on the title page; renumbering would also be
        // possible via section breaks, but most legal docs are one section.
        titlePage: false,
      },
      footers: {
        // Bottom-centered numerals — standard legal convention. Kept simple
        // ("1", "2", "3"); firms wanting "Page X of Y" can extend later.
        default: new Footer({
          children: [new DocxParagraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT] })],
          })],
        }),
      },
      children: [
        ...(title ? [h1(title)] : []),
        // Cast through unknown[] before re-casting: TS2589 bails on deeply
        // recursive BodyEntry[] when flat(Infinity) is typed directly.
        ...((body as unknown[]).flat(Infinity) as (Paragraph | Table)[]),
      ],
    }],
  });

  return Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(output, buffer);
    return output;
  });
};
