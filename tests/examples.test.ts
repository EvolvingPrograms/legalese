// End-to-end tests for the shipped templates rendered with their sample values.
// These exercise:
//   - schema-driven defined terms (long, term, article)
//   - {{$key}} introduction (value substitution)
//   - {{key}} reference form
//   - --values-file value loading via convertMarkdown's `values` option
//   - the YAML grids: from data file (replaces the old sample.json)

import { test, expect, beforeAll } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { convertMarkdown } from '@/md/convert';
import { OUT, ROOT, plain, readDocumentXml } from './_helpers';

beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

/** Render a shipped example with its companion <name>-sample.yml; return plain-text body. */
async function renderExample(name: string): Promise<string> {
  const tplPath    = path.resolve(ROOT, 'examples', `${name}.md`);
  const valuesPath = path.resolve(ROOT, 'examples', `${name}-sample.yml`);
  const output     = path.resolve(OUT, `${name}.docx`);

  const src = fs.readFileSync(tplPath, 'utf8');
  const values = yaml.load(fs.readFileSync(valuesPath, 'utf8')) as Record<string, unknown>;
  await convertMarkdown(src, {
    output,
    baseDir: path.dirname(tplPath),
    values,
  });
  return plain(readDocumentXml(output));
}

// — recording-publishing-agreement.md —

test('recording-publishing-agreement: {{$agreement}} expands long form and defines the term', async () => {
  const body = await renderExample('recording-publishing-agreement');
  expect(body).toContain('This Exclusive Recording and Publishing Agreement (the “Agreement”) is entered into');
});

test('recording-publishing-agreement: {{$writer}} / {{$company}} introduce the parties', async () => {
  const body = await renderExample('recording-publishing-agreement');
  expect(body).toContain('between Writer (also serving as the recording artist) (the “Writer”)');
  expect(body).toContain('and Company (the “Company”)');
});

test('recording-publishing-agreement: §3 introduces Initial / Renewal / Term', async () => {
  const body = await renderExample('recording-publishing-agreement');
  // {{$initial_term}} expands long + parenthetical define
  expect(body).toContain('The initial term of this Agreement (the “Initial Term”) shall begin');
  // {{$renewal_term}} (no expansion) → inline-styled with article "a"
  // {{$term}} (no expansion) → inline-styled with default article "the"
  // {{initial_term}}, {{renewal_terms}} → plain capitalized references with their articles
  expect(body).toContain('each, a “Renewal Term”; the Initial Term together with any Renewal Terms, the “Term”');
});

test('recording-publishing-agreement: §5 Recordings provisions exist', async () => {
  const body = await renderExample('recording-publishing-agreement');
  expect(body).toContain('5. Recordings Covered');
  expect(body).toContain('all master sound recordings produced, recorded, or co-recorded');
});

test('recording-publishing-agreement: §0 defines Party / Parties inline-styled', async () => {
  const body = await renderExample('recording-publishing-agreement');
  // §0 uses {{$party}} / {{$parties}} → inline-styled with schema's articles
  // ("a" singular, "the" plural).
  expect(body).toContain('individually as a “Party” and collectively as the “Parties”');
});

test('recording-publishing-agreement: {{$publishers_share}} expands long-form and defines the term', async () => {
  const body = await renderExample('recording-publishing-agreement');
  // ASCII apostrophe upgraded to curly at render time.
  expect(body).toContain('a 50% share (the “Publisher’s Share”)');
});

test('recording-publishing-agreement: subsequent {{publishers_share}} renders as plain reference', async () => {
  const body = await renderExample('recording-publishing-agreement');
  // Reference form is plain capitalized, with auto-article "the".
  expect(body).toContain('the Publisher’s Share royalties or master-recording royalties');
});

test('recording-publishing-agreement: "works made for hire" renders as plain quoted prose', async () => {
  const body = await renderExample('recording-publishing-agreement');
  // Just smart-quoted plain text, no styling — it's quoted statutory language,
  // not a defined term we're introducing.
  expect(body).toContain('are not “works made for hire” within the meaning');
});

test('recording-publishing-agreement: form values land in field/sig tables', async () => {
  const body = await renderExample('recording-publishing-agreement');
  expect(body).toContain('Sample Writer');
  expect(body).toContain('Sample Records LLC');
  expect(body).toContain('State of Delaware');
});

// — recording-assignment.md —

test('recording-assignment: {{$assignment}} expands and defines the term', async () => {
  const body = await renderExample('recording-assignment');
  expect(body).toContain('This Copyright Assignment (the “Assignment”) is made as of');
});

test('recording-assignment: schedule grid loads from recording-data.yml', async () => {
  const body = await renderExample('recording-assignment');
  // Heading template renders with album fields; first row is track 1 of the LP.
  expect(body).toContain('Sample LP (Album)');
  expect(body).toContain('UPC 0000000000001');
  expect(body).toContain('XXXXX2600001');
});

test('recording-assignment: inline grid object renders alongside the loaded file', async () => {
  const body = await renderExample('recording-assignment');
  expect(body).toContain('Sample EP (EP)');
  expect(body).toContain('Inline Track A');
});

test('recording-assignment: form values land in field/sig tables', async () => {
  const body = await renderExample('recording-assignment');
  expect(body).toContain('Sample Records LLC');
  expect(body).toContain('State of Delaware');
});
