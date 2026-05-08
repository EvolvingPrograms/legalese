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
    '  agreement: { def: "Copyright Assignment" }',
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

// — Bare value substitution: {{=key}} (docx path) —

test('{{=key}} renders just the value (no parens, no styling) in docx', async () => {
  const xml = await renderSourceToXml('_xp_eq_value', [
    '---',
    'title: TEST',
    'output: _xp_eq_value.docx',
    'schema:',
    '  company:',
    '    term: Company',
    'values:',
    '  company: Sample Records, Inc.',
    '---',
    '',
    'Filed by {{=company}} today.',
  ].join('\n'));
  expect(plain(xml)).toContain('Filed by Sample Records, Inc. today.');
  // No parenthetical define, no italic-quoted term emphasis.
  expect(plain(xml)).not.toContain('(the');
  expect(plain(xml)).not.toContain('“Company”');
});

test('{{=KEY}} uppercases the substituted value in docx', async () => {
  const xml = await renderSourceToXml('_xp_eq_caps', [
    '---',
    'title: TEST',
    'output: _xp_eq_caps.docx',
    'schema:',
    '  company:',
    '    term: Company',
    'values:',
    '  company: Sample Records, Inc.',
    '---',
    '',
    'BOARD RESOLUTIONS OF {{=COMPANY}}',
  ].join('\n'));
  expect(plain(xml)).toContain('BOARD RESOLUTIONS OF SAMPLE RECORDS, INC.');
});

// — Fill-in-blank for required-but-missing introductions —

test('{{$the_key}} renders a fill-in blank when the value is missing AND schema marks the key required', async () => {
  // Required + no value supplied → render `<BLANK> (the *"Term"*)` so
  // the unfilled spot is visually obvious in a draft. Re-running with
  // values fills the blank seamlessly.
  const { BLANK } = await import('@/md/inlines');
  const body = await renderSourceToXml('_xp_required_blank', [
    '---',
    'title: TEST',
    'output: _xp_required_blank.docx',
    'schema:',
    '  monthly_fee:',
    '    term: Monthly Fee',
    '    required: true',
    '---',
    '',
    'Customer shall pay {{$the_Monthly_fee}}.',
  ].join('\n'));
  expect(plain(body)).toContain(`Customer shall pay ${BLANK} (the “Monthly Fee”).`);
});

test('{{$key}} (required, no value) does NOT fill-in-blank when value is supplied at runtime', async () => {
  // Sanity: providing the value still wins over the blank treatment.
  const { convertMarkdown } = await import('@/md/convert');
  const path = await import('node:path');
  const { ROOT, readDocumentXml } = await import('./_helpers');
  const { BLANK } = await import('@/md/inlines');
  const out = path.resolve(OUT, '_xp_required_filled.docx');
  await convertMarkdown([
    '---',
    'title: TEST',
    'output: _xp_required_filled.docx',
    'schema:',
    '  monthly_fee:',
    '    term: Monthly Fee',
    '    required: true',
    '---',
    '',
    'Customer shall pay {{$the_Monthly_fee}}.',
  ].join('\n'), {
    output: out,
    baseDir: ROOT,
    values: { monthly_fee: '$1,850.00 per month' },
  });
  const body = plain(readDocumentXml(out));
  expect(body).toContain('Customer shall pay $1,850.00 per month (the “Monthly Fee”).');
  expect(body).not.toContain(BLANK);
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
    '  initial_term: { term: "Initial Term", def: "an initial term of two (2) years" }',
    '---',
    '',
    '{{$An_initial_term}} shall begin on the Effective Date.',
  ].join('\n'));

  // "An" capitalized in prose (sentence start), "an" lowercase in parens
  // (legal-drafting convention).
  expect(plain(body)).toContain('An initial term of two (2) years (an “Initial Term”)');
  expect(plain(body)).not.toContain('(An “Initial Term”)');
});

// — Key-case is cosmetic in {{$X}} (no article prefix) —

test('{{$Claude}} (capital key, no article prefix) does NOT capitalize the expansion', async () => {
  // The cap signal lives on the article prefix only (`The_`/`A_`/`An_`).
  // Mixed-case keys are allowed for prose-mirroring readability and do not
  // affect rendering — the label always comes from schema.term.
  const body = await renderSourceToXml('_xp_key_case_no_article', [
    '---',
    'title: TEST',
    'output: _xp_key_case_no_article.docx',
    'schema:',
    '  claude: { def: "an artificial intelligence model created by Anthropic" }',
    '---',
    '',
    'You are working with {{$Claude}}.',
  ].join('\n'));
  const out = plain(body);
  // Expansion stays lowercase ("an artificial…"), no parens article.
  expect(out).toContain('an artificial intelligence model created by Anthropic (“Claude”)');
  expect(out).not.toContain('An artificial intelligence');
  expect(out).not.toContain('(the “Claude”)');
});

test('{{$The_Claude}} (capital article prefix) DOES capitalize the prose article', async () => {
  // Capital `T` on the article prefix → cap'd article in prose AND cap'd
  // expansion. The parens article stays lowercase per legal-drafting style.
  const body = await renderSourceToXml('_xp_article_case', [
    '---',
    'title: TEST',
    'output: _xp_article_case.docx',
    'schema:',
    '  claude: { def: "an artificial intelligence model created by Anthropic" }',
    '---',
    '',
    '{{$The_Claude}} is helpful.',
  ].join('\n'));
  const out = plain(body);
  // Expansion cap'd at sentence start; parens article "the" stays lowercase.
  expect(out).toContain('An artificial intelligence model created by Anthropic (the “Claude”) is helpful.');
});

// — Catalog-array values don't collide with term lookup —

test('{{$the_key}} ignores object-array values (used by grids from: $key)', async () => {
  // values.locations is a catalog for `grids from: $locations`; the term
  // lookup must not splat the array of objects as a comma-separated expansion.
  const body = await renderSourceToXml('_xp_array_collision', [
    '---',
    'title: TEST',
    'output: _xp_array_collision.docx',
    'schema:',
    '  location: { term: "Location" }',
    'values:',
    '  locations:',
    '    - { name: "A", services: [] }',
    '    - { name: "B", services: [] }',
    '---',
    '',
    'Services at {{$the_Locations}}.',
  ].join('\n'));
  const out = plain(body);
  // No object-array splat (would look like "[object Object], and [object Object]")
  expect(out).not.toContain('[object Object]');
  // Falls through to inline-styled (no expansion → "the “Locations”").
  expect(out).toContain('Services at the “Locations”.');
});

// — Case-insensitive lookup —

test('{{Key}} and {{key}} resolve to the same schema entry', async () => {
  const a = await render('_xp_case_lower', 'Each {{the_capital}}.');
  const b = await render('_xp_case_upper', 'Each {{The_capital}}.');
  expect(a).toContain('Each the Capital.');
  expect(b).toContain('Each The Capital.');
});
