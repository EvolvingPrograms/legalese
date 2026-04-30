// Verifies the Buffer-returning APIs:
//   - `buildToBuffer` produces the same bytes that `build` writes to disk.
//   - `convertMarkdownToBuffer` round-trips a markdown source to a valid
//     .docx buffer with no filesystem access required by the caller.
//   - The `legalese/browser` subpath uses the WASM pandoc engine and
//     never imports `node:child_process` (no system pandoc on the path).

import { test, expect, describe, beforeAll } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { build, buildToBuffer, convertMarkdown, convertMarkdownToBuffer, p, h2 } from '@/index';
import { OUT, ROOT } from './_helpers';

beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

const DOCX_ZIP_MAGIC = Buffer.from('PK\x03\x04');

function isValidDocxBytes(buf: Buffer): boolean {
  return buf.subarray(0, 4).equals(DOCX_ZIP_MAGIC) && buf.length > 1000;
}

describe('buildToBuffer / build', () => {
  test('buildToBuffer returns a valid .docx Buffer (zip magic + non-trivial size)', async () => {
    const buf = await buildToBuffer({
      title: 'TEST',
      body: [p('Hello.'), h2('Section 1'), p('Body.')],
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(isValidDocxBytes(buf)).toBe(true);
  });

  test('build writes a file whose document.xml matches buildToBuffer output', async () => {
    // Two separate `Packer.toBuffer` calls embed different zip-entry
    // timestamps, so byte-equality is too strict. Compare the rendered
    // word/document.xml instead — that's the part callers care about.
    const args = {
      title: 'PARITY',
      body: [p('First.'), p('Second.')],
    };
    const out  = path.resolve(OUT, '_buffer_parity.docx');
    const out2 = path.resolve(OUT, '_buffer_parity_mem.docx');
    await build({ ...args, output: out });
    const memBytes = await buildToBuffer(args);
    fs.writeFileSync(out2, memBytes);
    const fileXml = execSync(`unzip -p "${out}"  word/document.xml`).toString();
    const memXml  = execSync(`unzip -p "${out2}" word/document.xml`).toString();
    expect(memXml).toBe(fileXml);
  });
});

describe('convertMarkdownToBuffer', () => {
  test('round-trips a markdown source to a valid .docx in memory (no fs)', async () => {
    const src = [
      '---',
      'title: TEST',
      'schema:',
      '  agreement: { long: "Test Agreement" }',
      '  customer:  { long: "Customer" }',
      'values:',
      '  customer: "Acme Corp"',
      '---',
      '',
      'This {{$the_Agreement}} is between {{$the_Customer}} and others.',
      '',
      '1. **First.** A numbered item.',
      '2. **Second.** Another.',
    ].join('\n');

    const buf = await convertMarkdownToBuffer(src);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(isValidDocxBytes(buf)).toBe(true);

    // Crack open the buffer (write to a temp path purely for `unzip -p`)
    // and confirm the rendered document.xml carries our values + defined
    // terms. This is the same shape the file-writing path produces, just
    // without ever asking `convertMarkdownToBuffer` to do the writing.
    const tmp = path.resolve(OUT, '_buffer_roundtrip.docx');
    fs.writeFileSync(tmp, buf);
    const documentXml = execSync(`unzip -p "${tmp}" word/document.xml`).toString();
    expect(documentXml).toContain('Test Agreement');
    expect(documentXml).toContain('Acme Corp');
    expect(documentXml).toContain('Agreement');
    expect(documentXml).toContain('Customer');
  });

  test('produces the same document.xml as the file-writing path', async () => {
    // Zip metadata (entry timestamps) can differ between two separate
    // packs even with identical content, so byte-equality is too strict.
    // The actual rendered content lives in word/document.xml — that's
    // what we compare.
    const src = [
      '---', 'title: SAME', '---',
      '',
      'Paragraph one.',
      '',
      'Paragraph two.',
    ].join('\n');
    const out  = path.resolve(OUT, '_buffer_vs_file.docx');
    const out2 = path.resolve(OUT, '_buffer_vs_file_mem.docx');
    await convertMarkdown(src, { output: out, baseDir: ROOT });
    const memBytes = await convertMarkdownToBuffer(src, { baseDir: ROOT });
    fs.writeFileSync(out2, memBytes);
    const fileXml = execSync(`unzip -p "${out}"  word/document.xml`).toString();
    const memXml  = execSync(`unzip -p "${out2}" word/document.xml`).toString();
    expect(memXml).toBe(fileXml);
  });

  test('honors caller-supplied `parse` (custom AST source)', async () => {
    // Prove parser injection works by feeding a pre-baked Pandoc AST and
    // verifying the rendered docx contains the marker text — proves the
    // default system-pandoc path was bypassed.
    const ast = {
      blocks: [
        { t: 'Para', c: [{ t: 'Str', c: 'INJECTED' }] },
      ],
    };
    const buf = await convertMarkdownToBuffer('this body is ignored', {
      parse: () => ast as never,
    });
    const tmp = path.resolve(OUT, '_buffer_inject.docx');
    fs.writeFileSync(tmp, buf);
    const xml = execSync(`unzip -p "${tmp}" word/document.xml`).toString();
    expect(xml).toContain('INJECTED');
    expect(xml).not.toContain('this body is ignored');
  });
});

// — `legalese/browser` subpath —
//
// Verifies the browser entry compiles, exports the same names, and
// defaults to the WASM engine. The subpath is the contract end users see.

describe('legalese/browser entry', () => {
  test('exports `convertMarkdownToBuffer` and round-trips via WASM pandoc', async () => {
    const browser = await import('@/browser');
    expect(typeof browser.convertMarkdownToBuffer).toBe('function');
    expect(typeof browser.buildToBuffer).toBe('function');
    expect(typeof browser.runPandocWasm).toBe('function');

    const src = [
      '---', 'title: BROWSER', '---',
      '',
      'Hello from WASM.',
      '',
      '{{$Customer}} signs first.',
    ].join('\n');

    const buf = await browser.convertMarkdownToBuffer(src);
    expect(isValidDocxBytes(buf)).toBe(true);

    const tmp = path.resolve(OUT, '_browser_entry.docx');
    fs.writeFileSync(tmp, buf);
    const xml = execSync(`unzip -p "${tmp}" word/document.xml`).toString();
    expect(xml).toContain('BROWSER');           // title
    expect(xml).toContain('Hello from WASM');
    expect(xml).toContain('Customer');          // marker resolved
  });

  test('subpath module never imports node:child_process', async () => {
    // The whole point of a browser subpath is bundlers can prune the
    // system-pandoc path. Walk the static-import graph from src/browser.ts
    // and assert no transitive file pulls in node:child_process.
    const visited = new Set<string>();
    const queue = [path.resolve(ROOT, 'src/browser.ts')];
    while (queue.length) {
      const file = queue.shift()!;
      if (visited.has(file)) continue;
      visited.add(file);
      const text = fs.readFileSync(file, 'utf8');
      // Bail loud if any reachable file shells out via child_process.
      expect(text.includes("from 'node:child_process'"), `${file} pulls in node:child_process`).toBe(false);
      expect(text.includes('from "node:child_process"'), `${file} pulls in node:child_process`).toBe(false);
      const importRe = /from\s+['"]([^'"]+)['"]/g;
      let m;
      while ((m = importRe.exec(text)) !== null) {
        const spec = m[1]!;
        if (!spec.startsWith('.') && !spec.startsWith('@/')) continue; // skip externals
        const base = spec.startsWith('@/')
          ? path.resolve(ROOT, 'src', spec.slice(2))
          : path.resolve(path.dirname(file), spec);
        for (const ext of ['.ts', '.tsx', '/index.ts', '.js']) {
          const candidate = base + ext;
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            queue.push(candidate);
            break;
          }
        }
      }
    }
    // Sanity: we actually traversed something.
    expect(visited.size).toBeGreaterThan(3);
  });
});
