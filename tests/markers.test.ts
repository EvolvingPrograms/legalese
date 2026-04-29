// End-to-end tests for the `{{...}}` marker forms.
//
//   {{Term}}        → (the *“Term”*)             — define inline (literal label)
//   {{!Term}}       → (*“Term”*)                  — define, proper-noun (no article)
//   {{snake_key}}   → <article> Some Key          — reference (auto-article from schema)
//   {{!snake_key}}  → Some Key                    — reference, no article (sentence-start, ad-hoc)
//   {{$snake_key}}  → <expansion> (<article> *“Some Key”*) — introduce (article from schema)
//
// Article is the schema's article (default "the"); set `schema[key].article: false`
// to drop it (proper nouns) or `article: "a"` / `"an"` / `"such"` to override.
// The `!` sigil is the only article control on literal labels and reference form;
// for `$` introductions, schema is the single source of truth.

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

test('{{!Term}} renders inline-styled with no parens (sentence-start define)', async () => {
  const xml = await renderToXml(
    '_marker_define_inline',
    '{{!Compositions}} means all original musical compositions written by Writer.',
  );
  // Inline styled: bold-italic curly-quoted label, no parens, no article.
  expect(plain(xml)).toContain('“Compositions” means all original musical compositions');
  expect(plain(xml)).not.toContain('(“Compositions”)');
});

// — Reference form —

test('{{snake_key}} references a term as plain capitalized text (no parens, no styling)', async () => {
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

  // Reference auto-emits the schema article (default "the").
  expect(plain(xml)).toContain('On the Effective Date, the parties agreed');
  expect(plain(xml)).not.toContain('“Effective Date”');
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

test('schema.article: false drops the article on {{$key}} introduce form', async () => {
  // The `!` sigil on $-form is gone; schema is the single source of truth.
  const xml = await renderSourceToXml('_marker_sub_proper', [
    '---',
    'title: TEST',
    'output: _marker_sub_proper.docx',
    'values:',
    '  collaborator: "Claude (claude-opus-4-7)"',
    'schema:',
    '  collaborator:',
    '    type: string',
    '    article: false',
    '---',
    '',
    'Signed by {{$collaborator}} on the date above.',
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
    'When a {{!liquidation_event}} occurs, the cascade triggers.',
  ].join('\n'));

  // `!` suppresses the auto-article so author can write "a" themselves.
  expect(plain(xml)).toContain('When a Liquidation Event (Severance) occurs');
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
    'This Agreement {{Agreement}}, dated {{$effective_date}}, references {{effective_date}} below.',
  ].join('\n'));

  expect(plain(xml)).toContain('This Agreement (the “Agreement”),');
  expect(plain(xml)).toContain('dated April 29, 2026 (the “Effective Date”),');
  // Reference auto-emits "the" — author no longer writes it in prose.
  expect(plain(xml)).toContain('references the Effective Date below.');
});

test('{{$key}} with no expansion renders inline-styled (no parens)', async () => {
  const xml = await renderSourceToXml('_marker_sub_inline', [
    '---',
    'title: TEST',
    'output: _marker_sub_inline.docx',
    '---',
    '',
    'each, {{$writer_name}}; thereafter…',
  ].join('\n'));
  // No value, no long → inline introduction; article defaults to "the".
  expect(plain(xml)).toContain('each, the “Writer Name”; thereafter');
  expect(plain(xml)).not.toContain('(the “Writer Name”)');
});
