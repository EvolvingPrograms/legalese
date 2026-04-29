// Sentence-start capitalization: when a marker that auto-emits an article
// (reference form `{{key}}` or inline-introduce `{{$key}}` with no expansion)
// sits at the start of a sentence or paragraph, the article is capitalized.
//
// Detection rules:
//   - Marker at very start of paragraph (no preceding text in this paragraph)
//   - Marker preceded only by sentence-ending punctuation (`.`, `?`, `!`)
//
// Other punctuation (`,`, `;`, `:`) does not trigger capitalization.

import { test, expect, beforeAll } from 'bun:test';
import fs from 'node:fs';
import { OUT, plain, renderSourceToXml } from './_helpers';

beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

test('reference at paragraph start capitalizes the article', async () => {
  const xml = await renderSourceToXml('_cap_para_start', [
    '---',
    'title: TEST',
    'output: _cap_para_start.docx',
    'schema:',
    '  party: { term: "Party" }',
    '---',
    '',
    '{{parties}} acknowledge the terms.',
  ].join('\n'));

  expect(plain(xml)).toContain('The Parties acknowledge the terms.');
});

test('reference after period mid-paragraph capitalizes the article', async () => {
  const xml = await renderSourceToXml('_cap_after_period', [
    '---',
    'title: TEST',
    'output: _cap_after_period.docx',
    'schema:',
    '  writers_share: { term: "Writer\'s Share" }',
    '---',
    '',
    'Writer is paid in accordance with each organization. {{writers_share}} follows the Writer.',
  ].join('\n'));

  expect(plain(xml)).toContain('. The Writer’s Share follows the Writer.');
});

test('reference mid-sentence does NOT capitalize', async () => {
  const xml = await renderSourceToXml('_cap_midsentence', [
    '---',
    'title: TEST',
    'output: _cap_midsentence.docx',
    'schema:',
    '  party: { term: "Party" }',
    '---',
    '',
    'Each obligation binds {{parties}} equally.',
  ].join('\n'));

  expect(plain(xml)).toContain('binds the Parties equally.');
  expect(plain(xml)).not.toContain('binds The Parties');
});

test('reference after comma/semicolon does NOT capitalize', async () => {
  const xml = await renderSourceToXml('_cap_after_comma', [
    '---',
    'title: TEST',
    'output: _cap_after_comma.docx',
    'schema:',
    '  party: { term: "Party" }',
    '---',
    '',
    'Subject to the foregoing, {{parties}} agree; {{parties}} also waive.',
  ].join('\n'));

  // Both refs are mid-sentence; lowercase article both times.
  expect(plain(xml)).toContain('foregoing, the Parties agree; the Parties also waive.');
});

test('inline-introduce {{$key}} (no expansion) capitalizes article at paragraph start', async () => {
  const xml = await renderSourceToXml('_cap_inline_intro', [
    '---',
    'title: TEST',
    'output: _cap_inline_intro.docx',
    'schema:',
    '  party: { term: "Party", article: "a" }',
    '---',
    '',
    '{{$party}} represents the contracting entity in this Agreement.',
  ].join('\n'));

  expect(plain(xml)).toContain('A “Party” represents the contracting entity');
});

test('list items DO trigger sentence-start capitalization (each item is its own clause)', async () => {
  const xml = await renderSourceToXml('_cap_list_item', [
    '---',
    'title: TEST',
    'output: _cap_list_item.docx',
    'schema:',
    '  publishers_share: { term: "Publisher\'s Share", long: "a 50% share" }',
    '---',
    '',
    'The parties agree as follows:',
    '',
    'a. {{$publishers_share}} of the underlying musical compositions;',
    'b. the right to register and license the works.',
  ].join('\n'));

  // List items are treated like paragraph starts — leading article capitalizes.
  expect(plain(xml)).toContain('A 50% share (the “Publisher’s Share”) of the underlying');
});

test('introduce with long expansion capitalizes the expansion at paragraph start', async () => {
  const xml = await renderSourceToXml('_cap_intro_long', [
    '---',
    'title: TEST',
    'output: _cap_intro_long.docx',
    'schema:',
    '  initial_term: { term: "Initial Term", long: "initial term of this Agreement" }',
    '---',
    '',
    '{{$initial_term}} shall begin on the Effective Date.',
  ].join('\n'));

  expect(plain(xml)).toContain('Initial term of this Agreement (the “Initial Term”) shall begin');
});
