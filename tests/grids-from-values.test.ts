// `grids: from: $key` resolves to a values array.
//
// Lets templates accept the catalog of grid sources at render time without
// baking paths into the .md. The value should be an array of YAML file paths
// (relative to the template's .md file) and/or inline objects with the same
// shape as a loaded file.

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
  'output: _grids_from_values.docx',
  '---',
  '',
  '## Catalog',
  '',
  '```grids',
  'from: $albums',
  'heading: "{album.title} — UPC {album.upc}"',
  'rows: tracks',
  'columns:',
  '  - {label: "#",     key: n,     width: 600}',
  '  - {label: Title,   key: title, width: 5000}',
  '```',
].join('\n');

test('from: $key resolves to a values array of inline objects', async () => {
  const out = path.resolve(OUT, '_grids_from_values.docx');
  await convertMarkdown(TEMPLATE, {
    output: out,
    baseDir: ROOT,
    values: {
      albums: [
        {
          album: { title: 'Album A', upc: '111' },
          tracks: [{ n: 1, title: 'Track A1' }, { n: 2, title: 'Track A2' }],
        },
        {
          album: { title: 'Album B', upc: '222' },
          tracks: [{ n: 1, title: 'Track B1' }],
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

test('from: $key with mixed file paths and inline objects', async () => {
  // Paths from `$key` resolve relative to CWD; use an absolute path so the
  // test is independent of where it's run from.
  const dataPath = path.resolve(OUT, '_grid_data.yml');
  fs.writeFileSync(dataPath, [
    'album:',
    '  title: "From File"',
    '  upc: "999"',
    'tracks:',
    '  - { n: 1, title: "FileTrack" }',
  ].join('\n'));

  const out = path.resolve(OUT, '_grids_from_mixed.docx');
  await convertMarkdown(TEMPLATE, {
    output: out,
    baseDir: ROOT,
    values: {
      albums: [
        dataPath,            // absolute path
        {
          album: { title: 'Inline', upc: '333' },
          tracks: [{ n: 1, title: 'InlineTrack' }],
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

test('from: $missing renders empty (warns and produces no rows)', async () => {
  const out = path.resolve(OUT, '_grids_from_missing.docx');
  await convertMarkdown(TEMPLATE, {
    output: out,
    baseDir: ROOT,
    values: {},          // no `albums` key
  });

  const body = plain(readDocumentXml(out));
  // Heading from the test ("Catalog") still renders; no album-specific text.
  expect(body).toContain('Catalog');
  expect(body).not.toContain('UPC');
});
