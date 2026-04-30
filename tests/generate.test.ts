// End-to-end generation test: the shipped example renders to a valid .docx.
//   - recording-publishing-agreement.md   fields, sig, defined-term markers

import { test, expect, beforeAll } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { convertMarkdown } from '@/md/convert';

const ROOT = path.resolve(import.meta.dir, '..');
const OUT  = path.resolve(ROOT, 'out/tests');

beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

/** Render `examples/<name>.md` to `out/tests/<name>.docx` and return the path. */
async function generate(relPath: string): Promise<string> {
  const abs = path.resolve(ROOT, relPath);
  const src = fs.readFileSync(abs, 'utf8');
  const output = path.resolve(OUT, `${path.basename(relPath, '.md')}.docx`);
  await convertMarkdown(src, { output, baseDir: path.dirname(abs) });
  return output;
}

/** A real .docx is a ZIP — its first two bytes are `PK`. */
function isDocx(p: string): boolean {
  return fs.readFileSync(p).slice(0, 2).toString() === 'PK';
}

test('recording-publishing-agreement.md → valid .docx', async () => {
  const out = await generate('examples/recording-publishing-agreement.md');
  expect(fs.existsSync(out)).toBe(true);
  expect(isDocx(out)).toBe(true);
  expect(fs.statSync(out).size).toBeGreaterThan(5000);
});

test('public API surface exports expected helpers', async () => {
  const lib = await import('@/index') as Record<string, unknown>;
  for (const name of [
    't', 'b', 'i', 'bi', 'dt',
    'p', 'h1', 'h2', 'list', 'spacer', 'raw',
    'fieldTable', 'signatureTable', 'gridTable',
    'build', 'defaults',
  ]) {
    expect(lib[name]).toBeDefined();
  }
});
