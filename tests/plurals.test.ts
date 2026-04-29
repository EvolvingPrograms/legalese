// Plural handling for defined-term markers.
//
// Schema authors declare ONE entry (singular OR plural — whichever reads more
// naturally) and the marker layer resolves the other side automatically:
//
//   schema:
//     recording: { term: "Recording" }    # {{recording}} → Recording, {{recordings}} → Recordings
//     party:     { term: "Party" }        # {{party}} → Party, {{parties}} → Parties (y → ies)
//     person:    { term: "Person", plural: "People" }   # irregular: explicit override
//
// `{{$key}}` with an array value renders an Oxford-comma list before the
// parenthetical:  values.recordings = ["A","B","C"] → "A, B, and C (the *“Recordings”*)".

import { test, expect, beforeAll } from 'bun:test';
import fs from 'node:fs';
import { OUT, plain, renderSourceToXml } from './_helpers';

beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

test('plural derived by default: {{recordings}} resolves via {{recording}}', async () => {
  const xml = await renderSourceToXml('_plural_default', [
    '---',
    'title: TEST',
    'output: _plural_default.docx',
    'schema:',
    '  recording: { term: "Recording" }',
    '---',
    '',
    '{{!recording}} is one of {{recordings}}.',  // ! suppresses the auto-article on first
  ].join('\n'));

  // Reference auto-emits "the": "the Recordings" / "Recording" (article suppressed).
  expect(plain(xml)).toContain('Recording is one of the Recordings.');
});

test('y → ies plural: {{parties}} from schema.party', async () => {
  const xml = await renderSourceToXml('_plural_ies', [
    '---',
    'title: TEST',
    'output: _plural_ies.docx',
    'schema:',
    '  party: { term: "Party" }',
    '---',
    '',
    'No fewer than {{!party}} or {{parties}}.',
  ].join('\n'));

  expect(plain(xml)).toContain('No fewer than Party or the Parties.');
});

test('singular derived from plural-only schema entry', async () => {
  const xml = await renderSourceToXml('_plural_reverse', [
    '---',
    'title: TEST',
    'output: _plural_reverse.docx',
    'schema:',
    '  recordings: { term: "Recordings" }',
    '---',
    '',
    '{{!recording}} is one of {{recordings}}.',
  ].join('\n'));

  expect(plain(xml)).toContain('Recording is one of the Recordings.');
});

test('irregular plural via explicit schema.plural', async () => {
  const xml = await renderSourceToXml('_plural_irregular', [
    '---',
    'title: TEST',
    'output: _plural_irregular.docx',
    'schema:',
    '  person: { term: "Person", plural: "People" }',
    '---',
    '',
    'Each {{!person}} and {{persons}} appear here.',
  ].join('\n'));

  // Suppress article on first marker (sentence already has "Each");
  // plural reference auto-emits article from schema (default "the").
  expect(plain(xml)).toContain('Each Person and the People appear here.');
});

test('{{$key}} with array value renders Oxford-comma list and defines the term', async () => {
  const xml = await renderSourceToXml('_plural_list_three', [
    '---',
    'title: TEST',
    'output: _plural_list_three.docx',
    'schema:',
    '  recording: { term: "Recording" }',
    'values:',
    '  recordings:',
    '    - "Track A"',
    '    - "Track B"',
    '    - "Track C"',
    '---',
    '',
    'Assigned: {{$recordings}}.',
  ].join('\n'));

  expect(plain(xml)).toContain('Assigned: Track A, Track B, and Track C (the “Recordings”).');
});

test('{{$key}} with two-element array renders "A and B" (no comma)', async () => {
  const xml = await renderSourceToXml('_plural_list_two', [
    '---',
    'title: TEST',
    'output: _plural_list_two.docx',
    'schema:',
    '  recording: { term: "Recording" }',
    'values:',
    '  recordings: ["Track A", "Track B"]',
    '---',
    '',
    'Assigned: {{$recordings}}.',
  ].join('\n'));

  expect(plain(xml)).toContain('Assigned: Track A and Track B (the “Recordings”).');
});

test('{{$key}} with single-element array drops the conjunction', async () => {
  const xml = await renderSourceToXml('_plural_list_one', [
    '---',
    'title: TEST',
    'output: _plural_list_one.docx',
    'schema:',
    '  recording: { term: "Recording" }',
    'values:',
    '  recordings: ["Track A"]',
    '---',
    '',
    'Assigned: {{$recordings}}.',
  ].join('\n'));

  expect(plain(xml)).toContain('Assigned: Track A (the “Recordings”).');
});
