// `grid: from: $key` resolves to a values array.
//
// Lets templates accept the catalog of grid sources at render time without
// baking paths into the .md. The value should be an array of `{heading?, rows}`
// objects, file paths to YAMLs of the same shape, or a mix of both.

import { test, expect, beforeAll } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { convertMarkdown } from '@/md/convert';
import { OUT, ROOT, plain, readDocumentXml } from './_helpers';

beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

const TEMPLATE = [
  '---',
  'title: TEST',
  'output: _grid_from_values.docx',
  '---',
  '',
  '## Catalog',
  '',
  '```grid',
  'from: $albums',
  'columns:',
  '  - {label: "#",     key: n,     width: 600}',
  '  - {label: Title,   key: title, width: 5000}',
  '```',
].join('\n');

test('from: $key resolves to a values array of inline entries', async () => {
  const out = path.resolve(OUT, '_grid_from_values.docx');
  await convertMarkdown(TEMPLATE, {
    output: out,
    baseDir: ROOT,
    values: {
      albums: [
        {
          heading: 'Album A — UPC 111',
          rows: [{ n: 1, title: 'Track A1' }, { n: 2, title: 'Track A2' }],
        },
        {
          heading: 'Album B — UPC 222',
          rows: [{ n: 1, title: 'Track B1' }],
        },
      ],
    },
  });

  const body = plain(readDocumentXml(out));
  expect(body).toContain('Album A — UPC 111');
  expect(body).toContain('Track A1');
  expect(body).toContain('Track A2');
  expect(body).toContain('Album B — UPC 222');
  expect(body).toContain('Track B1');
});

test('from: $key with mixed file paths and inline entries', async () => {
  // Paths from `$key` resolve relative to CWD; use an absolute path so the
  // test is independent of where it's run from.
  const dataPath = path.resolve(OUT, '_grid_data.yml');
  fs.writeFileSync(dataPath, [
    'heading: "From File — UPC 999"',
    'rows:',
    '  - { n: 1, title: "FileTrack" }',
  ].join('\n'));

  const out = path.resolve(OUT, '_grid_from_mixed.docx');
  await convertMarkdown(TEMPLATE, {
    output: out,
    baseDir: ROOT,
    values: {
      albums: [
        dataPath,            // absolute path
        {
          heading: 'Inline — UPC 333',
          rows: [{ n: 1, title: 'InlineTrack' }],
        },
      ],
    },
  });

  const body = plain(readDocumentXml(out));
  expect(body).toContain('From File — UPC 999');
  expect(body).toContain('FileTrack');
  expect(body).toContain('Inline — UPC 333');
  expect(body).toContain('InlineTrack');
});

test('from: $missing renders empty (no rows)', async () => {
  const out = path.resolve(OUT, '_grid_from_missing.docx');
  await convertMarkdown(TEMPLATE, {
    output: out,
    baseDir: ROOT,
    values: {},          // no `albums` key
  });

  const body = plain(readDocumentXml(out));
  expect(body).toContain('Catalog');
  expect(body).not.toContain('UPC');
});

test('rows: $key pulls a flat row array from values (single table, no repeater)', async () => {
  const TPL = [
    '---',
    'title: TEST',
    'output: _grid_rows_dollar.docx',
    '---',
    '',
    '```grid',
    'rows: $units',
    'columns:',
    '  - {label: Model,  key: model,  width: 4000}',
    '  - {label: Serial, key: serial, width: 2500}',
    '```',
  ].join('\n');

  const out = path.resolve(OUT, '_grid_rows_dollar.docx');
  await convertMarkdown(TPL, {
    output: out,
    baseDir: ROOT,
    values: {
      units: [
        { model: 'Caterpillar 320', serial: 'CAT320-001' },
        { model: 'Genie S-65',      serial: 'GEN-S65-002' },
      ],
    },
  });

  const body = plain(readDocumentXml(out));
  expect(body).toContain('Caterpillar 320');
  expect(body).toContain('CAT320-001');
  expect(body).toContain('Genie S-65');
});

test('entry with no heading renders just the table', async () => {
  const out = path.resolve(OUT, '_grid_no_heading.docx');
  await convertMarkdown(TEMPLATE, {
    output: out,
    baseDir: ROOT,
    values: {
      albums: [
        { rows: [{ n: 1, title: 'Untitled' }] },
      ],
    },
  });

  const body = plain(readDocumentXml(out));
  expect(body).toContain('Untitled');
});
