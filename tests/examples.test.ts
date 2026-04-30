// End-to-end tests for the shipped templates rendered with their sample values.
// These exercise:
//   - schema-driven defined terms (long, term, plural)
//   - {{$key}} introduction (value substitution + long fallback)
//   - {{key}} reference forms (plain, the_, the_X plurals)
//   - --values-file value loading via convertMarkdown's `values` option
//   - the `grids: from: $key` mixed pattern (file path + inline objects)

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

// — landscaping-agreement.md —

test('landscaping: {{$the_Agreement}} expands the value override and defines the term', async () => {
  const body = await renderExample('landscaping-agreement');
  expect(body).toContain('This Landscaping Services Agreement (the “Agreement”) is entered into');
});

test('landscaping: {{$the_Customer}} / {{$the_Contractor}} introduce the parties from values', async () => {
  const body = await renderExample('landscaping-agreement');
  expect(body).toContain("McDonald's USA, LLC, a Delaware limited liability company, with offices at 110 N Carpenter St, Chicago, IL 60607 (the “Customer”)");
  expect(body).toContain('Greenline Landscaping, Inc., an Illinois corporation, with offices at 4421 W Industrial Park Rd, Naperville, IL 60563 (the “Contractor”)');
});

test('landscaping: §0 introduces Party / Parties inline-styled', async () => {
  const body = await renderExample('landscaping-agreement');
  expect(body).toContain('individually as a “Party” and collectively as the “Parties”');
});

test('landscaping: §3 introduces Initial Term / Renewal Term / Term from schema.long', async () => {
  const body = await renderExample('landscaping-agreement');
  // {{$the_Initial_term}} — `long: "an initial term of two (2) years"` baked
  // into schema, bare {{$key}}-style is in §3 but uses {{$the_Initial_term}}
  // here so the parens article is "the".
  expect(body).toContain('an initial term of two (2) years (the “Initial Term”)');
  // {{$renewal_term}} → bare introduce, no parens article; long bakes "successive…"
  expect(body).toContain('successive renewal terms of one (1) year each (“Renewal Term”)');
});

test('landscaping: {{$the_Locations}} (plural) does not splat the catalog array', async () => {
  // Regression: values.locations is the catalog for `grids from: $locations`.
  // The marker should NOT pull the array as a comma-separated expansion.
  const body = await renderExample('landscaping-agreement');
  expect(body).not.toContain('[object Object]');
  expect(body).toContain('collectively, the “Locations”');
});

test('landscaping: {{$the_Monthly_fee}} expands schema.long (no value override)', async () => {
  const body = await renderExample('landscaping-agreement');
  expect(body).toContain('$1,850.00 per Location per month (the “Monthly Fee”)');
});

test('landscaping: form values land in the §1 fields and §14 sig blocks', async () => {
  const body = await renderExample('landscaping-agreement');
  expect(body).toContain('Michael Torres');
  expect(body).toContain('Sarah Chen');
  expect(body).toContain('State of Illinois');
});

test('landscaping: grids renders one heading per location, mixing external file + inline entries', async () => {
  const body = await renderExample('landscaping-agreement');
  // Lincoln Park comes from examples/landscaping-lincoln-park.yml.
  expect(body).toContain('Lincoln Park — 1234 N Lincoln Ave, Chicago, IL 60614');
  // Cicero and Oak Lawn are inline entries.
  expect(body).toContain('Cicero — Roosevelt Rd — 5678 W Roosevelt Rd, Cicero, IL 60804');
  expect(body).toContain('Oak Lawn — Cicero Ave — 9012 S Cicero Ave, Oak Lawn, IL 60453');
  // Service rows.
  expect(body).toContain('Mowing & Trimming');
  expect(body).toContain('Snow & Ice Removal');
});
