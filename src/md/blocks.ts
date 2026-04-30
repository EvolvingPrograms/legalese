// Pandoc block AST -> doc-builder block conversion.

import { Paragraph, HeadingLevel, AlignmentType } from 'docx';
import type { Table } from 'docx';
import { p, list, spacer } from '@/blocks';

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
    case 'Plain':
      return [p(...inlinesToRuns(blk.c as PandocInline[], { values, schema: ctx.schema }))];

    case 'Div': {
      // ::: {.center}
      // Centered paragraph(s)
      // :::
      const [attrs, children] = blk.c as [[string, string[], unknown[]], PandocBlock[]];
      const [, classes] = attrs;
      const center = classes.includes('center');
      const out: DocNode[] = [];
      for (const child of children) {
        if (center && (child.t === 'Para' || child.t === 'Plain')) {
          out.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: inlinesToRuns(child.c as PandocInline[], { values, schema: ctx.schema }),
          }));
        } else {
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
