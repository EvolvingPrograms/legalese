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

/** Render a shipped example with its companion sample.yml; return plain-text body. */
async function renderExample(name: string): Promise<string> {
  const tplPath    = path.resolve(ROOT, 'examples', `${name}.md`);
  const valuesPath = path.resolve(ROOT, 'examples', `${name.split('-')[0]}-sample.yml`);
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

// — songwriter-agreement.md —

test('songwriter-agreement: {{$agreement}} expands long form and defines the term', async () => {
  const body = await renderExample('songwriter-agreement');
  expect(body).toContain('This Exclusive Songwriter Agreement (the “Agreement”) is entered into');
});

test('songwriter-agreement: {{$writer}} / {{$company}} introduce the parties', async () => {
  const body = await renderExample('songwriter-agreement');
  expect(body).toContain('between the Writer (the “Writer”)');
  expect(body).toContain('and the Company (the “Company”)');
});

test('songwriter-agreement: {{party}} / {{parties}} render as inline references', async () => {
  const body = await renderExample('songwriter-agreement');
  expect(body).toContain('individually as a “Party” and collectively as the “Parties”');
});

test('songwriter-agreement: {{$publishers_share}} expands long, omits article (article: false)', async () => {
  const body = await renderExample('songwriter-agreement');
  // ASCII apostrophe in the schema is upgraded to curly at render time.
  expect(body).toContain('a 50% share (“Publisher’s Share”)');
  expect(body).not.toContain('(the “Publisher’s Share”)');
});

test('songwriter-agreement: subsequent {{publishers_share}} renders as inline reference', async () => {
  const body = await renderExample('songwriter-agreement');
  // Section 7 references the term twice without the long-form expansion.
  expect(body).toContain('“Publisher’s Share” royalties received by Company');
});

test('songwriter-agreement: {{!Works Made for Hire}} — proper-noun literal, no article', async () => {
  const body = await renderExample('songwriter-agreement');
  expect(body).toContain('the Compositions are not (“Works Made for Hire”)');
  expect(body).not.toContain('(the “Works Made for Hire”)');
});

test('songwriter-agreement: form values land in field/sig tables', async () => {
  const body = await renderExample('songwriter-agreement');
  expect(body).toContain('Sample Writer');
  expect(body).toContain('Sample Records LLC');
  expect(body).toContain('State of Texas');
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
