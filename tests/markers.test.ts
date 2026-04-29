// End-to-end tests for the `{{...}}` marker forms.
//
//   {{Term}}        → (the *“Term”*)             — define inline (literal label)
//   {{!Term}}       → (*“Term”*)                  — define, proper-noun (no article)
//   {{snake_key}}   → *“Some Key”*                — reference (no parens)
//   {{$snake_key}}  → <expansion> (the *“Some Key”*) — introduce
//   {{!$snake_key}} → <expansion> (*“Some Key”*)     — introduce, no article
//
// Articles are emitted INSIDE the parens so authors don't write "the (Term)".
// `schema[key].article: false` opts a key out globally; the `!` sigil is a
// per-marker override.
//
// Curly quotes are pinned by every assertion below — a regression to straight
// quotes would fail every test.

import { test, expect, beforeAll } from 'bun:test';
import fs from 'node:fs';
import { OUT, plain, renderToXml, renderSourceToXml } from './_helpers';

beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

// — Literal-label define forms —

test('{{Term}} defines inline with article inside parens', async () => {
  const xml = await renderToXml(
    '_marker_define',
    'Exclusive Songwriter Agreement {{Agreement}} is entered into today.',
  );
  expect(plain(xml)).toContain('Exclusive Songwriter Agreement (the “Agreement”) is entered into today.');
});

test('{{Term}} works for multi-word labels (Str+Space token flattening)', async () => {
  const xml = await renderToXml(
    '_marker_define_multi',
    'The Human Writer {{Human Writer}} signs below.',
  );
  expect(plain(xml)).toContain('The Human Writer (the “Human Writer”) signs below.');
});

test('{{!Term}} drops the article (proper-noun opt-out)', async () => {
  const xml = await renderToXml(
    '_marker_define_proper',
    'Our AI collaborator {{!Claude}} signs below.',
  );
  expect(plain(xml)).toContain('Our AI collaborator (“Claude”) signs below.');
  expect(plain(xml)).not.toContain('(the “Claude”)');
});

// — Reference form —

test('{{snake_key}} references a term inline (no parens, no article)', async () => {
  const xml = await renderSourceToXml('_marker_ref', [
    '---',
    'title: TEST',
    'output: _marker_ref.docx',
    'values:',
    '  effective_date: "April 29, 2026"',
    '---',
    '',
    'On {{effective_date}}, the parties agreed to terms.',
  ].join('\n'));

  expect(plain(xml)).toContain('On “Effective Date”, the parties agreed');
  expect(plain(xml)).not.toContain('(“Effective Date”)');
  expect(plain(xml)).not.toContain('(the “Effective Date”)');
});

// — Substitute / introduce forms —

test('{{$key}} expands the value and defines the term with article', async () => {
  const xml = await renderSourceToXml('_marker_sub', [
    '---',
    'title: TEST',
    'output: _marker_sub.docx',
    'values:',
    '  effective_date: "December 1, 2026"',
    '---',
    '',
    'This Agreement is dated as of {{$effective_date}} for clarity.',
  ].join('\n'));

  expect(plain(xml)).toContain('dated as of December 1, 2026 (the “Effective Date”) for clarity');
});

test('{{!$key}} expands the value and defines without article', async () => {
  const xml = await renderSourceToXml('_marker_sub_proper', [
    '---',
    'title: TEST',
    'output: _marker_sub_proper.docx',
    'values:',
    '  collaborator: "Claude (claude-opus-4-7)"',
    '---',
    '',
    'Signed by {{!$collaborator}} on the date above.',
  ].join('\n'));

  expect(plain(xml)).toContain('Signed by Claude (claude-opus-4-7) (“Collaborator”) on the date above.');
});

// — Schema-driven behaviors —

test('schema.term overrides the auto-derived label', async () => {
  const xml = await renderSourceToXml('_marker_term_override', [
    '---',
    'title: TEST',
    'output: _marker_term_override.docx',
    'schema:',
    '  liquidation_event:',
    '    type: string',
    '    term: "Liquidation Event (Severance)"',
    '---',
    '',
    'A {{liquidation_event}} triggers the cascade.',
  ].join('\n'));

  expect(plain(xml)).toContain('A “Liquidation Event (Severance)” triggers the cascade.');
});

test('schema.article: false suppresses the article on define+introduce forms', async () => {
  const xml = await renderSourceToXml('_marker_article_false', [
    '---',
    'title: TEST',
    'output: _marker_article_false.docx',
    'values:',
    '  claude: "Claude Opus 4.7"',
    'schema:',
    '  claude:',
    '    type: string',
    '    article: false',
    '---',
    '',
    'Signed by {{$claude}} below.',
  ].join('\n'));

  expect(plain(xml)).toContain('Signed by Claude Opus 4.7 (“Claude”) below.');
  expect(plain(xml)).not.toContain('(the “Claude”)');
});

test('schema.long expands {{$key}} when no runtime value is set', async () => {
  const xml = await renderSourceToXml('_marker_long_expansion', [
    '---',
    'title: TEST',
    'output: _marker_long_expansion.docx',
    'schema:',
    '  agreement:',
    '    long: "Exclusive Songwriter Agreement"',
    '---',
    '',
    'This {{$agreement}} is entered into today.',
  ].join('\n'));

  expect(plain(xml)).toContain('This Exclusive Songwriter Agreement (the “Agreement”) is entered into today.');
});

test('runtime value beats schema.long for {{$key}}', async () => {
  const xml = await renderSourceToXml('_marker_long_value_priority', [
    '---',
    'title: TEST',
    'output: _marker_long_value_priority.docx',
    'values:',
    '  agreement: "Custom Agreement"',
    'schema:',
    '  agreement:',
    '    long: "Exclusive Songwriter Agreement"',
    '---',
    '',
    'This {{$agreement}} is entered into today.',
  ].join('\n'));

  expect(plain(xml)).toContain('This Custom Agreement (the “Agreement”)');
});

// — Mixed paragraph (smoke test for all three forms together) —

test('all three marker forms can coexist in one paragraph', async () => {
  const xml = await renderSourceToXml('_marker_mixed', [
    '---',
    'title: TEST',
    'output: _marker_mixed.docx',
    'values:',
    '  effective_date: "April 29, 2026"',
    '---',
    '',
    'This Agreement {{Agreement}}, dated {{$effective_date}}, references the {{effective_date}} below.',
  ].join('\n'));

  expect(plain(xml)).toContain('This Agreement (the “Agreement”),');
  expect(plain(xml)).toContain('dated April 29, 2026 (the “Effective Date”),');
  expect(plain(xml)).toContain('references the “Effective Date” below.');
});

test('{{$key}} with no value and no schema.long collapses to a plain define', async () => {
  const xml = await renderSourceToXml('_marker_sub_collapse', [
    '---',
    'title: TEST',
    'output: _marker_sub_collapse.docx',
    '---',
    '',
    'See {{$writer_name}} for details.',
  ].join('\n'));

  expect(plain(xml)).toContain('See (the “Writer Name”) for details.');
});
