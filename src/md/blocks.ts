// Pandoc block AST -> doc-builder block conversion.

import { Paragraph, HeadingLevel, AlignmentType } from 'docx';
import type { Table } from 'docx';
import { p, list, spacer } from '@/blocks';
import { PARA_SPACING } from '@/lib/defaults';

import { inlinesToRuns } from './inlines';
import { parseFieldsBlock, parseSigBlock, parseGridBlock } from './fenced';
import type { PandocBlock, PandocInline, ConvertCtx } from './types';

type DocNode = Paragraph | Table;

export function blockToDocBuilder(
  blk: PandocBlock,
  values: Record<string, unknown>,
  ctx: ConvertCtx,
): DocNode[] {
  switch (blk.t) {
    case 'Header': {
      const [level, attrs, inlines] = blk.c as [number, [string, string[], unknown[]], PandocInline[]];
      const [, classes] = attrs;
      const pageBreak = classes.includes('pageBreak') || classes.includes('pagebreak');
      const center = classes.includes('center');
      const runs = inlinesToRuns(inlines, { values, schema: ctx.schema });
      const headingLevel = level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2;
      return [new Paragraph({
        heading: headingLevel,
        pageBreakBefore: pageBreak,
        ...(center ? { alignment: AlignmentType.CENTER } : {}),
        children: runs,
      })];
    }

    case 'Para':
    case 'Plain': {
      const runs = inlinesToRuns(blk.c as PandocInline[], { values, schema: ctx.schema });
      if (ctx.indent) {
        // Document-level first-line indent — legal block style.
        return [new Paragraph({
          spacing: PARA_SPACING,
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 720 },
          children: runs,
        })];
      }
      return [p(...runs)];
    }

    case 'Div': {
      // ::: {.center}     — center-aligned paragraphs
      // ::: {.indent}     — first-line-indented paragraphs (legal block style:
      //                     "WHEREAS, …" recitals indent at the start of each
      //                     paragraph instead of being separated by subheadings)
      // ::: {.pageBreak}  — start a new page before this Div's content. Use
      //                     for signature pages: drop the "## Signatures"
      //                     heading and just wrap the closing prose so the
      //                     undersigned paragraph + sig tables land on a
      //                     fresh page.
      // ::: {.gap}        — empty Div emits a tall blank paragraph, for vertical
      //                     breathing room (e.g. before "[SIGNATURE PAGE TO
      //                     FOLLOW.]"). When used alongside `{.center}` etc. on
      //                     a non-empty Div, adds extra `before` spacing to
      //                     the first paragraph.
      const [attrs, children] = blk.c as [[string, string[], unknown[]], PandocBlock[]];
      const [, classes] = attrs;
      const center = classes.includes('center');
      const indent = classes.includes('indent');
      const pageBreak = classes.includes('pageBreak') || classes.includes('pagebreak');
      const gap = classes.includes('gap');

      // Empty {.gap} — emit a tall blank paragraph (~one line height).
      if (gap && children.length === 0) {
        return [new Paragraph({ spacing: { before: 240, after: 240 }, children: [] })];
      }
      // Empty {.pageBreak} — emit a standalone page-break paragraph. Useful
      // as a "break here" mark via the inline form `::: {.pageBreak} :::`.
      if (pageBreak && children.length === 0) {
        return [new Paragraph({ pageBreakBefore: true, children: [] })];
      }
      const out: DocNode[] = [];
      let pageBreakApplied = !pageBreak;
      for (const child of children) {
        const isPara = child.t === 'Para' || child.t === 'Plain';
        // Para/Plain children are reconstructed in-place so we can apply Div
        // attributes (center, indent, pageBreak) directly to the Paragraph.
        if (isPara && (center || indent || gap || !pageBreakApplied)) {
          // Match the default body-paragraph styling (justified, 1.5 line,
          // before/after spacing) so Div paragraphs flow with the same
          // breathing room as plain prose. Center overrides justification.
          // {.gap} adds extra `before` spacing for vertical breathing room.
          const spacing = gap
            ? { ...PARA_SPACING, before: 480 }
            : PARA_SPACING;
          out.push(new Paragraph({
            spacing,
            alignment: center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
            ...(indent ? { indent: { firstLine: 720 } } : {}),
            ...(!pageBreakApplied ? { pageBreakBefore: true } : {}),
            children: inlinesToRuns(child.c as PandocInline[], { values, schema: ctx.schema }),
          }));
          pageBreakApplied = true;
        } else {
          // Non-paragraph child (or Div with no qualifying attribute). For
          // pageBreak-only Divs whose first child is, e.g., a code block,
          // emit an empty page-break paragraph so the break still fires.
          if (!pageBreakApplied) {
            out.push(new Paragraph({ pageBreakBefore: true, children: [] }));
            pageBreakApplied = true;
          }
          out.push(...blockToDocBuilder(child, values, ctx));
        }
      }
      return out;
    }

    case 'OrderedList':
    case 'BulletList': {
      const items: PandocBlock[][] = blk.t === 'OrderedList'
        ? (blk.c as [unknown, PandocBlock[][]])[1]
        : blk.c as PandocBlock[][];
      const itemsAsRuns = items.map((itemBlocks) => {
        const allInlines: PandocInline[] = [];
        for (const ib of itemBlocks) {
          if (ib.t === 'Plain' || ib.t === 'Para') allInlines.push(...(ib.c as PandocInline[]));
        }
        return inlinesToRuns(allInlines, { values, schema: ctx.schema });
      });
      return list(...itemsAsRuns);
    }

    case 'CodeBlock': {
      const [attrs, content] = blk.c as [[string, string[], unknown[]], string];
      const [, classes] = attrs;
      const lang = classes[0];
      if (lang === 'fields') return [parseFieldsBlock(content, values, ctx.schema)];
      if (lang === 'sig')    return parseSigBlock(content, values);
      if (lang === 'grid')   return parseGridBlock(content, ctx, values);
      console.warn('Unknown fenced block:', lang);
      return [];
    }

    case 'HorizontalRule':
      return [spacer()];

    case 'BlockQuote':
    case 'DefinitionList':
    case 'Table':
    case 'RawBlock':
    case 'Null':
      return [];

    default:
      console.warn('Unhandled block type:', blk.t);
      return [];
  }
}
