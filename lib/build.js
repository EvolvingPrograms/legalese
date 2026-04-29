// build({ title, output, body }) — compose the Document, write it, return the path.

import fs from 'node:fs';
import {
  Document, Packer, AlignmentType, HeadingLevel, LevelFormat,
} from 'docx';
import {
  FONT, BODY_SIZE, H1_SIZE, H2_SIZE,
  PAGE, MARGIN, SUBLIST_REF,
} from './defaults.js';
import { h1 } from './blocks.js';

/** @typedef {import('docx').Paragraph | import('docx').Table} BodyNode */
/** @typedef {BodyNode | BodyNode[]} BodyEntry */

/**
 * Write a .docx to `output`. Returns a Promise resolving to the path.
 * `body` is a flat or nested array of Paragraph/Table entries; `list()` returns
 * arrays, so anything reachable through `flat(Infinity)` is fine.
 * @param {{ title?: string, output: string, body: BodyEntry[] }} args
 * @returns {Promise<string>}
 */
export const build = ({ title, output, body }) => {
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
      properties: { page: { size: PAGE, margin: MARGIN } },
      children: [
        ...(title ? [h1(title)] : []),
        .../** @type {BodyNode[]} */ (body.flat(Infinity)),
      ],
    }],
  });

  return Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(output, buffer);
    return output;
  });
};
