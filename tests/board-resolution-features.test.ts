// Tests for the three board-resolution-oriented features:
//   - {{^TEXT}}        small-caps literal run
//   - ::: {.center}    centered paragraph block via pandoc Div
//   - sig from: $key   multi-signer repeater (one stacked sig table per entry)

import { test, expect, beforeAll } from 'bun:test';
import fs from 'node:fs';
import { OUT, plain, renderSourceToXml } from './_helpers';

beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

// — Small caps —

test('{{^Whereas}} emits a small-caps run', async () => {
  const xml = await renderSourceToXml('_smallcaps', [
    '---', 'title: TEST', 'output: _smallcaps.docx', '---',
    '',
    '{{^Whereas}}, the Company desires to proceed.',
  ].join('\n'));
  // Find the run containing "Whereas" and check for <w:smallCaps/>.
  const idx = xml.indexOf('Whereas');
  expect(idx).toBeGreaterThan(-1);
  const runStart = xml.lastIndexOf('<w:r>', idx);
  const runEnd = xml.indexOf('</w:r>', idx);
  const run = xml.slice(runStart, runEnd + 6);
  expect(run).toContain('<w:smallCaps/>');
  // Plain text comes through as-is (small caps is rendered, not encoded).
  expect(plain(xml)).toContain('Whereas, the Company desires to proceed.');
});

test('{{^Multi Word}} preserves spacing inside small-caps run', async () => {
  const xml = await renderSourceToXml('_smallcaps_multi', [
    '---', 'title: TEST', 'output: _smallcaps_multi.docx', '---',
    '',
    '{{^Now, Therefore, Be It Resolved}}, that the Agreement is approved.',
  ].join('\n'));
  expect(plain(xml)).toContain('Now, Therefore, Be It Resolved, that the Agreement is approved.');
  const idx = xml.indexOf('Now, Therefore');
  const runStart = xml.lastIndexOf('<w:r>', idx);
  const runEnd = xml.indexOf('</w:r>', idx);
  expect(xml.slice(runStart, runEnd + 6)).toContain('<w:smallCaps/>');
});

// — Centered paragraph via Div —

test('::: {.center} ... ::: renders a centered paragraph', async () => {
  const xml = await renderSourceToXml('_center_div', [
    '---', 'title: TEST', 'output: _center_div.docx', '---',
    '',
    '::: {.center}',
    '**Centered Title**',
    ':::',
    '',
    'Left-aligned body.',
  ].join('\n'));
  // Find the paragraph containing "Centered Title" and verify alignment=center.
  const idx = xml.indexOf('Centered Title');
  expect(idx).toBeGreaterThan(-1);
  const pStart = xml.lastIndexOf('<w:p', idx);
  const pEnd = xml.indexOf('</w:p>', idx);
  const para = xml.slice(pStart, pEnd + 6);
  expect(para).toMatch(/<w:jc\s+w:val="center"\s*\/>/);

  // Body paragraph should NOT have center alignment.
  const bodyIdx = xml.indexOf('Left-aligned body');
  const bodyPStart = xml.lastIndexOf('<w:p', bodyIdx);
  const bodyPEnd = xml.indexOf('</w:p>', bodyIdx);
  const bodyPara = xml.slice(bodyPStart, bodyPEnd + 6);
  expect(bodyPara).not.toMatch(/<w:jc\s+w:val="center"/);
});

test('## Heading {.center} renders a centered heading', async () => {
  const xml = await renderSourceToXml('_center_heading', [
    '---', 'title: TEST', 'output: _center_heading.docx', '---',
    '',
    '## Centered Heading {.center}',
  ].join('\n'));
  const idx = xml.indexOf('Centered Heading');
  const pStart = xml.lastIndexOf('<w:p', idx);
  const pEnd = xml.indexOf('</w:p>', idx);
  const para = xml.slice(pStart, pEnd + 6);
  expect(para).toMatch(/<w:jc\s+w:val="center"\s*\/>/);
  expect(para).toContain('Heading2');
});

// — Sig repeater via from: $key —

test('sig from: $directors with explicit values renders names and stacks blocks', async () => {
  // Use convertMarkdown directly so we can inject `values`.
  const { convertMarkdown } = await import('@/md/convert');
  const path = await import('node:path');
  const { ROOT, readDocumentXml } = await import('./_helpers');
  const out = path.resolve(OUT, '_sig_from_values.docx');
  await convertMarkdown([
    '---', 'title: TEST', 'output: _sig_from_values.docx', '---',
    '',
    '```sig',
    'from: $directors',
    'DIRECTOR',
    'Name | name',
    'Title | title',
    'Signature [tall]',
    'Date',
    '```',
  ].join('\n'), {
    output: out,
    baseDir: ROOT,
    values: {
      directors: [
        { name: 'Alex Morgan',  title: 'Chair' },
        { name: 'Priya Shah',   title: 'Director' },
        { name: 'Devon Park',   title: 'Director' },
      ],
    },
  });
  const body = plain(readDocumentXml(out));
  expect(body).toContain('Alex Morgan');
  expect(body).toContain('Priya Shah');
  expect(body).toContain('Devon Park');
  // Each director gets their own DIRECTOR header — count occurrences.
  const headerMatches = body.match(/DIRECTOR/g) ?? [];
  expect(headerMatches.length).toBe(3);
});

test('sig from: $missing renders empty (no error)', async () => {
  const { convertMarkdown } = await import('@/md/convert');
  const path = await import('node:path');
  const { ROOT, readDocumentXml } = await import('./_helpers');
  const out = path.resolve(OUT, '_sig_from_missing.docx');
  await convertMarkdown([
    '---', 'title: TEST', 'output: _sig_from_missing.docx', '---',
    '',
    'Body.',
    '',
    '```sig',
    'from: $absent',
    'PARTY',
    'Name | name',
    'Signature [tall]',
    '```',
  ].join('\n'), {
    output: out,
    baseDir: ROOT,
    values: {},
  });
  const body = plain(readDocumentXml(out));
  expect(body).toContain('Body.');
  expect(body).not.toContain('PARTY');
});
