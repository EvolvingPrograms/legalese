// Pandoc block AST -> doc-builder block conversion.

import { Paragraph, HeadingLevel } from 'docx';
import { p, list, spacer } from '../blocks.js';
import { inlinesToRuns } from './inlines.js';
import { parseFieldsBlock, parseSigBlock, parseGridBlock, parseGridsBlock } from './fenced.js';

/** @typedef {import('./pandoc.js').PandocBlock} PandocBlock */
/** @typedef {import('docx').Paragraph | import('docx').Table} DocNode */
/** @typedef {{ baseDir: string }} ConvertCtx */

/**
 * @param {PandocBlock} blk
 * @param {Record<string, unknown>} values
 * @param {ConvertCtx} ctx
 * @returns {DocNode[]}
 */
export function blockToDocBuilder(blk, values, ctx) {
  switch (blk.t) {
    case 'Header': {
      const [level, attrs, inlines] = blk.c;
      const [, classes] = attrs;
      const pageBreak = classes.includes('pageBreak') || classes.includes('pagebreak');
      const runs = inlinesToRuns(inlines);
      const headingLevel = level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2;
      return [new Paragraph({
        heading: headingLevel,
        pageBreakBefore: pageBreak,
        children: runs,
      })];
    }

    case 'Para':
    case 'Plain':
      return [p(...inlinesToRuns(blk.c))];

    case 'OrderedList':
    case 'BulletList': {
      const items = blk.t === 'OrderedList' ? blk.c[1] : blk.c;
      /** @type {import('docx').TextRun[][]} */
      const itemsAsRuns = items.map(/** @param {PandocBlock[]} itemBlocks */ (itemBlocks) => {
        /** @type {import('./pandoc.js').PandocInline[]} */
        const allInlines = [];
        for (const ib of itemBlocks) {
          if (ib.t === 'Plain' || ib.t === 'Para') allInlines.push(...ib.c);
        }
        return inlinesToRuns(allInlines);
      });
      return list(...itemsAsRuns);
    }

    case 'CodeBlock': {
      const [attrs, content] = blk.c;
      const [, classes] = attrs;
      const lang = classes[0];
      if (lang === 'fields') return [parseFieldsBlock(content, values)];
      if (lang === 'sig')    return [parseSigBlock(content, values)];
      if (lang === 'grid')   return [parseGridBlock(content)];
      if (lang === 'grids')  return parseGridsBlock(content, ctx);
      console.warn('Unknown fenced block:', lang);
      return [];
    }

    case 'HorizontalRule':
      return [spacer()];

    case 'BlockQuote':
    case 'DefinitionList':
    case 'Table':
    case 'Div':
    case 'RawBlock':
    case 'Null':
      return [];

    default:
      console.warn('Unhandled block type:', blk.t);
      return [];
  }
}
