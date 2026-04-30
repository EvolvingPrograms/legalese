/**
 * Compose and write a .docx file from a title and body entries.
 * House styles (fonts, headings, numbering) are applied here so callers
 * never need to think about them.
 */

import fs from 'node:fs';
import {
  Document, Packer, AlignmentType, LevelFormat,
  Footer, Paragraph as DocxParagraph, TextRun, PageNumber,
} from 'docx';
import type { Paragraph, Table } from 'docx';

import {
  FONT, BODY_SIZE, H1_SIZE, H2_SIZE,
  PAGE, MARGIN, SUBLIST_REF,
} from './defaults';
import { h1 } from '@/blocks';
import type { BodyEntry } from '@/types';

/** Write `body` (flat or nested) to `output` as a .docx; resolves to the output path. */
export const build = ({ title, output, body }: {
  title?: string;
  output: string;
  body: BodyEntry[];
}): Promise<string> => {
  const doc = new Document({
    styles: {
      default: { document: { run: { font: FONT, size: BODY_SIZE } } },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1',
          basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: H1_SIZE, bold: true, font: FONT },
          paragraph: {
            spacing: { before: 240, after: 360 },
            outlineLevel: 0,
            alignment: AlignmentType.CENTER,
          },
        },
        {
          id: 'Heading2', name: 'Heading 2',
          basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: H2_SIZE, bold: true, font: FONT },
          paragraph: {
            spacing: { before: 280, after: 120 },
            outlineLevel: 1,
            keepNext: true,
          },
        },
      ],
    },
    numbering: {
      config: [{
        reference: SUBLIST_REF,
        levels: [{
          level: 0,
          format: LevelFormat.LOWER_LETTER,
          text: '(%1)',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
    sections: [{
      properties: {
        page: { size: PAGE, margin: MARGIN },
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
