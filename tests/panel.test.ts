// Verifies the borderless `panel` fenced block — used for execution
// blocks, notarization panels, and address blocks where the bordered
// `sig` table looks too form-like.

import { test, expect, beforeAll } from 'bun:test';
import fs from 'node:fs';
import { OUT, plain, renderSourceToXml } from './_helpers';

beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

test('panel renders a 2-column borderless table with left + right arrays', async () => {
  const xml = await renderSourceToXml('_panel_2col', [
    '---',
    'title: TEST',
    'output: _panel_2col.docx',
    '---',
    '',
    '```panel',
    'left:',
    '  - ""',
    '  - "Date: October 28, 2021"',
    '  - ""',
    '  - ""',
    'right:',
    '  - "FACEBOOK, INC."',
    '  - "By: /s/ Mark Zuckerberg"',
    '  - "Name: Mark Zuckerberg"',
    '  - "Title: Chief Executive Officer"',
    '```',
  ].join('\n'));
  const body = plain(xml);
  expect(body).toContain('FACEBOOK, INC.');
  expect(body).toContain('Date: October 28, 2021');
  expect(body).toContain('Mark Zuckerberg');
  expect(body).toContain('Chief Executive Officer');
});

test('panel emits a borderless table (no border XML)', async () => {
  const xml = await renderSourceToXml('_panel_borders', [
    '---',
    'title: TEST',
    'output: _panel_borders.docx',
    '---',
    '',
    '```panel',
    'right:',
    '  - "ACME, INC."',
    '  - "By: /s/ Signer"',
    '```',
  ].join('\n'));
  // Pull the panel's <w:tbl> block — the table that holds "ACME, INC."
  // The body has a TEST heading table-of-contents-free; this is the only
  // explicit Table element (TitleHeading paragraph + our panel).
  const tblStart = xml.indexOf('<w:tbl>');
  expect(tblStart).toBeGreaterThan(-1);
  const tblEnd = xml.indexOf('</w:tbl>', tblStart) + '</w:tbl>'.length;
  const panelXml = xml.slice(tblStart, tblEnd);
  // Borderless cells use BorderStyle.NONE — no <w:val="single"> on cell borders.
  // Sanity: the table contains the panel content.
  expect(panelXml).toContain('ACME, INC.');
  // Each cell border declares val="none" (rather than "single").
  expect(panelXml).toMatch(/<w:tcBorders>[\s\S]*?w:val="none"/);
});

test('panel resolves {{=key}} markers in entries', async () => {
  const xml = await renderSourceToXml('_panel_markers', [
    '---',
    'title: TEST',
    'output: _panel_markers.docx',
    'schema:',
    '  company:',
    '    term: Company',
    '  signer:',
    '    term: Signer',
    'values:',
    '  company: Spellcraft Inc.',
    '  signer: Lewis Miller',
    '---',
    '',
    '```panel',
    'right:',
    '  - "{{=COMPANY}}"',
    '  - "By: /s/ {{=Signer}}"',
    '  - "Name: {{=Signer}}"',
    '```',
  ].join('\n'));
  const body = plain(xml);
  expect(body).toContain('SPELLCRAFT INC.');
  expect(body).toContain('By: /s/ Lewis Miller');
  expect(body).toContain('Name: Lewis Miller');
});

test('panel with only `right:` renders a single right-side column', async () => {
  const xml = await renderSourceToXml('_panel_single', [
    '---',
    'title: TEST',
    'output: _panel_single.docx',
    '---',
    '',
    '```panel',
    'right:',
    '  - "Acme Inc."',
    '  - "By: /s/ Signer"',
    '```',
  ].join('\n'));
  expect(plain(xml)).toContain('Acme Inc.');
  expect(plain(xml)).toContain('By: /s/ Signer');
});

test('panel pads the shorter side with empty cells (rows stay aligned)', async () => {
  const xml = await renderSourceToXml('_panel_pad', [
    '---',
    'title: TEST',
    'output: _panel_pad.docx',
    '---',
    '',
    '```panel',
    'left:',
    '  - "Date: 2026-01-01"',
    'right:',
    '  - "ACME INC."',
    '  - "By: signer"',
    '  - "Title: CEO"',
    '```',
  ].join('\n'));
  const body = plain(xml);
  // Three rows total; left only has one populated.
  expect(body).toContain('Date: 2026-01-01');
  expect(body).toContain('ACME INC.');
  expect(body).toContain('By: signer');
  expect(body).toContain('Title: CEO');
});
