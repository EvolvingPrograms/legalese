// Marker expansion table — exhaustive coverage of every supported form.
//
// Article is carried in the marker prefix, not the schema:
//   {{key}}       → Key                  (plain — no article)
//   {{the_key}}   → the Key              (definite)
//   {{The_key}}   → The Key              (capitalized — sentence start)
//   {{a_key}}     → a Key | an Key       (indefinite — auto-picks by vowel)
//   {{An_key}}    → An Key | A Key       (capitalized indefinite)
//   {{$key}}      → expansion (the *Key*)        (introduce + define)
//   {{$the_key}}  → expansion (the *Key*)
//   {{$a_key}}    → expansion (a *Key*) | (an *Key*)
//   {{Term}}      → (the *Term*)         (literal define, parens)
//   {{!Term}}     → *Term*                (literal define, inline-styled)
//
// Lookup is case-insensitive — `{{Key}}` and `{{key}}` resolve identically.

import { test, expect, beforeAll } from 'bun:test';
import fs from 'node:fs';
import { OUT, plain, renderSourceToXml } from './_helpers';

beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

const SCHEMA_BLOCK = [
  'schema:',
  '  capital:   { term: "Capital" }',
  '  abacus:    { term: "Abacus" }',
  '  recording: { term: "Recording" }',
  '  honor:     { term: "Honor" }',         // silent H — should pick "an"
  '  uniform:   { term: "Uniform" }',       // sounds like "you-" — should pick "a"
];

async function render(name: string, body: string): Promise<string> {
  const xml = await renderSourceToXml(name, [
    '---',
    'title: TEST',
    `output: ${name}.docx`,
    ...SCHEMA_BLOCK,
    '---',
    '',
    body,
  ].join('\n'));
  return plain(xml);
}

// — Plain reference (no article) —

test('{{key}} renders the term plain (no article, no styling)', async () => {
  expect(await render('_xp_plain', 'Each {{capital}} shall be valued.')).toContain('Each Capital shall be valued.');
});

// — Definite article via `the_` prefix —

test('{{the_key}} renders "the Key"', async () => {
  expect(await render('_xp_the', 'Established near {{the_capital}}.')).toContain('Established near the Capital.');
});

test('{{The_key}} capitalizes the article (sentence start)', async () => {
  expect(await render('_xp_the_cap', '{{The_capital}} shall be valued.')).toContain('The Capital shall be valued.');
});

// — Indefinite article via `a_` / `an_` prefix —

test('{{a_key}} picks "a" before consonant', async () => {
  expect(await render('_xp_a', 'Pay {{a_capital}}.')).toContain('Pay a Capital.');
});

test('{{a_key}} auto-picks "an" before vowel', async () => {
  // Term "Abacus" starts with a vowel → marker emits "an" even though
  // author wrote "a_".
  expect(await render('_xp_an_auto', 'Pay {{a_abacus}}.')).toContain('Pay an Abacus.');
});

test('{{an_key}} picks "an" before vowel', async () => {
  expect(await render('_xp_an', 'Pay {{an_abacus}}.')).toContain('Pay an Abacus.');
});

test('{{an_key}} auto-picks "a" before consonant', async () => {
  // Author over-specified "an" but term starts with a consonant — emit "a".
  expect(await render('_xp_a_auto', 'Pay {{an_capital}}.')).toContain('Pay a Capital.');
});

test('{{An_key}} capitalizes the indefinite article', async () => {
  expect(await render('_xp_an_cap', '{{An_abacus}} is required.')).toContain('An Abacus is required.');
});

test('a/an respects "an honor" exception (silent H)', async () => {
  expect(await render('_xp_honor', 'Confer {{a_honor}}.')).toContain('Confer an Honor.');
});

test('a/an respects "a uniform" exception (yoo- sound)', async () => {
  expect(await render('_xp_uniform', 'Wear {{an_uniform}}.')).toContain('Wear a Uniform.');
});

// — O(1) flip: change the term, articles auto-update —

test('flipping schema.term from consonant to vowel auto-flips a → an', async () => {
  // Same author markup, different schema → article auto-adjusts.
  const consonant = await render('_xp_flip_c', 'Each {{a_recording}} shall be assigned.');
  expect(consonant).toContain('Each a Recording shall be assigned.');

  // Now render with the term renamed to vowel-start.
  const vowelXml = plain(await renderSourceToXml('_xp_flip_v', [
    '---',
    'title: TEST',
    'output: _xp_flip_v.docx',
    'schema:',
    '  recording: { term: "Original Sound Recording" }',
    '---',
    '',
    'Each {{a_recording}} shall be assigned.',
  ].join('\n')));
  // "Original" starts with O → "an Original Sound Recording"
  expect(vowelXml).toContain('Each an Original Sound Recording shall be assigned.');
});

// — Plurals still work via bidirectional schema lookup —

test('{{the_keys}} renders plural with "the"', async () => {
  expect(await render('_xp_plural', 'Catalog {{the_recordings}}.')).toContain('Catalog the Recordings.');
});

// — Introduce form `{{$key}}` —

test('{{$the_key}} introduces with definite article inside parens', async () => {
  const body = await renderSourceToXml('_xp_intro_the', [
    '---',
    'title: TEST',
    'output: _xp_intro_the.docx',
    'schema:',
    '  agreement: { long: "Copyright Assignment" }',
    '---',
    '',
    'This {{$the_agreement}} shall govern.',
  ].join('\n'));
  expect(plain(body)).toContain('This Copyright Assignment (the “Agreement”) shall govern.');
});

test('{{$a_key}} (no expansion) renders inline-styled with auto-picked indefinite article', async () => {
  const body = await renderSourceToXml('_xp_intro_a', [
    '---',
    'title: TEST',
    'output: _xp_intro_a.docx',
    'schema:',
    '  composition: { term: "Composition" }',
    '---',
    '',
    '{{$A_composition}} is owned by Writer.',
  ].join('\n'));
  // No expansion (no value, no long) → inline-styled, no parens.
  // "Composition" starts with consonant → "a" stays as-is.
  expect(plain(body)).toContain('A “Composition” is owned by Writer.');
});

// — Literal define forms (unchanged) —

test('{{Term}} renders the literal-define parenthetical with "the"', async () => {
  expect(await render('_xp_literal', 'This Agreement {{Agreement}} is binding.'))
    .toContain('This Agreement (the “Agreement”) is binding.');
});

test('{{!Term}} renders inline-styled (no parens, sentence-start define)', async () => {
  expect(await render('_xp_literal_inline', '{{!Compositions}} means all original works.'))
    .toContain('“Compositions” means all original works.');
});

// — Capitalized introduce keeps parens article lowercase —

test('{{$An_key}} capitalizes the prose expansion but keeps the parens article lowercase', async () => {
  const body = await renderSourceToXml('_xp_intro_cap_parens', [
    '---',
    'title: TEST',
    'output: _xp_intro_cap_parens.docx',
    'schema:',
    '  initial_term: { term: "Initial Term", long: "an initial term of two (2) years" }',
    '---',
    '',
    '{{$An_initial_term}} shall begin on the Effective Date.',
  ].join('\n'));

  // "An" capitalized in prose (sentence start), "an" lowercase in parens
  // (legal-drafting convention).
  expect(plain(body)).toContain('An initial term of two (2) years (an “Initial Term”)');
  expect(plain(body)).not.toContain('(An “Initial Term”)');
});

// — Case-insensitive lookup —

test('{{Key}} and {{key}} resolve to the same schema entry', async () => {
  const a = await render('_xp_case_lower', 'Each {{the_capital}}.');
  const b = await render('_xp_case_upper', 'Each {{The_capital}}.');
  expect(a).toContain('Each the Capital.');
  expect(b).toContain('Each The Capital.');
});
