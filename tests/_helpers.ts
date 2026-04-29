// Shared helpers for the docx-rendering regression tests.

import { execSync } from 'node:child_process';
import path from 'node:path';
import { convertMarkdown } from '@/md/convert';

export const ROOT = path.resolve(import.meta.dir, '..');
export const OUT  = path.resolve(ROOT, 'out/tests');

/** Extract word/document.xml from a generated .docx via the system `unzip`. */
export function readDocumentXml(docxPath: string): string {
  return execSync(`unzip -p "${docxPath}" word/document.xml`, { encoding: 'utf8' });
}

/** Render an inline markdown body to a .docx and return its document.xml. */
export async function renderToXml(name: string, body: string): Promise<string> {
  const src = `---\ntitle: TEST\noutput: ${name}.docx\n---\n\n${body}\n`;
  const output = path.resolve(OUT, `${name}.docx`);
  await convertMarkdown(src, { output, baseDir: ROOT });
  return readDocumentXml(output);
}

/** Render a full markdown source (with front-matter) to a .docx and return its document.xml. */
export async function renderSourceToXml(name: string, src: string): Promise<string> {
  const output = path.resolve(OUT, `${name}.docx`);
  await convertMarkdown(src, { output, baseDir: ROOT });
  return readDocumentXml(output);
}

/** Strip XML tags AND decode common entities so assertions target rendered plain text.
 *  Also normalizes pandoc's no-break spaces (inserted by `+smart` after abbreviations
 *  like "c. ") to regular spaces so assertions can use plain ASCII spaces. */
export const plain = (xml: string): string =>
  xml
    .replace(/<[^>]+>/g, '')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/ /g, ' ');
