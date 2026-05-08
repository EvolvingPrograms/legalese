// Verifies `{{...}}` markers expand inside fenced blocks (sig, grid,
// fields). Body prose handles markers via the Pandoc-AST inline path;
// fenced blocks bypass that, so the parsers run substituteMarkers on
// every user-text spot (header, label, heading, sub, prefix, cell).

import { test, expect, beforeAll } from 'bun:test';
import fs from 'node:fs';
import { OUT, plain, renderSourceToXml } from './_helpers';

beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

test('sig block headers resolve {{=KEY}} markers', async () => {
  const xml = await renderSourceToXml('_fenced_sig_header', [
    '---',
    'title: TEST',
    'output: _fenced_sig_header.docx',
    'schema:',
    '  company:',
    '    term: Company',
    'values:',
    '  company: Spellcraft Inc.',
    '---',
    '',
    '```sig',
    'WRITER || {{=COMPANY}}',
    'Name | sig_writer || Name | sig_company',
    'Date              || Date',
    '```',
  ].join('\n'));
  const body = plain(xml);
  expect(body).toContain('SPELLCRAFT INC.');
  // No leftover marker syntax.
  expect(body).not.toContain('{{');
});

test('grid heading (from: repeater) resolves markers', async () => {
  const xml = await renderSourceToXml('_fenced_grid_heading', [
    '---',
    'title: TEST',
    'output: _fenced_grid_heading.docx',
    'schema:',
    '  company:',
    '    term: Company',
    'values:',
    '  company: Spellcraft Inc.',
    '  schedules:',
    '    - heading: "Services for {{=Company}}"',
    '      rows:',
    '        - { item: Mowing, freq: Weekly }',
    '---',
    '',
    '```grid',
    'from: $schedules',
    'columns:',
    '  - {label: Item, key: item, width: 2000}',
    '  - {label: Frequency, key: freq, width: 1500}',
    '```',
  ].join('\n'));
  const body = plain(xml);
  expect(body).toContain('Services for Spellcraft Inc.');
});

test('grid column labels resolve markers', async () => {
  const xml = await renderSourceToXml('_fenced_grid_label', [
    '---',
    'title: TEST',
    'output: _fenced_grid_label.docx',
    'schema:',
    '  company:',
    '    term: Company',
    'values:',
    '  company: Spellcraft Inc.',
    '---',
    '',
    '```grid',
    'columns:',
    '  - {label: "{{=Company}} item", key: item, width: 2000}',
    '  - {label: Frequency, key: freq, width: 1500}',
    'rows:',
    '  - { item: Mowing, freq: Weekly }',
    '```',
  ].join('\n'));
  const body = plain(xml);
  expect(body).toContain('Spellcraft Inc. item');
});

test('grid cell values resolve markers', async () => {
  const xml = await renderSourceToXml('_fenced_grid_cell', [
    '---',
    'title: TEST',
    'output: _fenced_grid_cell.docx',
    'schema:',
    '  vendor:',
    '    term: Vendor',
    'values:',
    '  vendor: Acme Co.',
    '---',
    '',
    '```grid',
    'columns:',
    '  - {label: Item, key: item, width: 2000}',
    '  - {label: Provider, key: provider, width: 2000}',
    'rows:',
    '  - { item: Mowing, provider: "{{=Vendor}}" }',
    '```',
  ].join('\n'));
  const body = plain(xml);
  expect(body).toContain('Acme Co.');
});

test('field block label and sub resolve markers', async () => {
  const xml = await renderSourceToXml('_fenced_fields', [
    '---',
    'title: TEST',
    'output: _fenced_fields.docx',
    'schema:',
    '  company:',
    '    term: Company',
    'values:',
    '  company: Spellcraft Inc.',
    '---',
    '',
    '```fields',
    'Effective Date | effective_date',
    'Spotify URL | spotify | sub=if {{=Company}} requires credit',
    '```',
  ].join('\n'));
  const body = plain(xml);
  expect(body).toContain('if Spellcraft Inc. requires credit');
});
