// Pins the pangram example documented in SKILL.md so the docs stay accurate.
// Covers every form the doc claims to demonstrate:
//   - {{$the_X}} introduce + value substitution
//   - {{$a_X}} introduce, no expansion (inline-styled)
//   - {{$the_X}} introduce, no expansion (inline-styled, definite)
//   - {{The_X}} reference, sentence-start capitalized
//   - {{X}} plain reference, no article
//   - {{the_X}} plain reference with article
//   - {{!Term}} literal inline-styled

import { test, expect, beforeAll } from 'bun:test';
import fs from 'node:fs';
import { OUT, plain, renderSourceToXml } from './_helpers';

beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

const PANGRAM_TEMPLATE = [
  '---',
  'title: TEST',
  'output: _skill_pangram.docx',
  'schema:',
  '  agreement:    { long: "Agreement" }',
  '  customer:     { long: "Customer" }',
  '  contractor:   { long: "Contractor" }',
  '  party:        { term: "Party" }',
  '  location:     { term: "Location" }',
  '  insurance:    { term: "Insurance" }',
  '  monthly_fee:  { term: "Monthly Fee" }',
  '  effective_date: { type: date, required: true }',
  'values:',
  '  effective_date: "June 1, 2026"',
  '  agreement: "Landscaping Services Agreement"',
  '  customer: "McDonald\'s USA, LLC"',
  '  contractor: "Greenline Landscaping, Inc."',
  '  monthly_fee: "$1,850.00"',
  '---',
  '',
  'This {{$the_Agreement}}, dated {{$the_Effective_date}}, is between',
  '{{$the_Customer}} and {{$the_Contractor}}, individually {{$a_Party}} and',
  'collectively {{$the_Parties}}. {{The_Contractor}} shall provide',
  '{{!Services}} at each {{Location}} listed in {{!Schedule A}} for',
  '{{$the_Monthly_fee}} per {{Location}}, subject to the {{Insurance}}',
  'requirements set out below.',
].join('\n');

let body: string;

beforeAll(async () => {
  const xml = await renderSourceToXml('_skill_pangram', PANGRAM_TEMPLATE);
  body = plain(xml);
});

// — Introduce-with-value substitution —

test('{{$the_agreement}}: value beats long, parens with "the"', () => {
  expect(body).toContain('Landscaping Services Agreement (the “Agreement”)');
});

test('{{$the_effective_date}}: value substitutes, parens with "the"', () => {
  expect(body).toContain('June 1, 2026 (the “Effective Date”)');
});

test('{{$the_customer}}: value substitutes', () => {
  expect(body).toContain("McDonald's USA, LLC (the “Customer”)");
});

test('{{$the_contractor}}: value substitutes', () => {
  expect(body).toContain('Greenline Landscaping, Inc. (the “Contractor”)');
});

test('{{$the_monthly_fee}}: dollar amount as value', () => {
  expect(body).toContain('$1,850.00 (the “Monthly Fee”)');
});

// — Introduce-no-expansion (inline-styled) —

test('{{$a_party}}: no expansion → inline-styled with "a"', () => {
  expect(body).toContain('individually a “Party”');
});

test('{{$the_parties}}: no expansion → inline-styled with "the"', () => {
  expect(body).toContain('collectively the “Parties”');
});

// — Reference forms —

test('{{The_contractor}}: sentence-start capitalized reference', () => {
  expect(body).toContain('The Contractor shall provide');
});

test('{{location}}: plain reference, no article', () => {
  // "at each Location" and "per Location" — both plain capitalized, no article.
  expect(body).toContain('at each Location');
  expect(body).toContain('per Location');
});

test('{{insurance}}: plain reference, no article — author writes "the" in prose', () => {
  expect(body).toContain('subject to the Insurance requirements');
});

// — Literal inline-styled —

test('{{!Services}}: literal label, inline-styled, no parens', () => {
  expect(body).toContain('shall provide “Services” at each');
});

test('{{!Schedule A}}: multi-word literal, inline-styled', () => {
  expect(body).toContain('listed in “Schedule A”');
});

// — Full pangram — sanity check the whole sentence flows correctly —

test('full rendered pangram matches expected output', () => {
  // Strip trailing whitespace from the rendered body for a clean compare.
  const expected = [
    'This Landscaping Services Agreement (the “Agreement”),',
    'dated June 1, 2026 (the “Effective Date”),',
    "is between McDonald's USA, LLC (the “Customer”)",
    'and Greenline Landscaping, Inc. (the “Contractor”),',
    'individually a “Party” and collectively the “Parties”.',
    'The Contractor shall provide “Services” at each Location',
    'listed in “Schedule A” for $1,850.00 (the “Monthly Fee”) per Location,',
    'subject to the Insurance requirements set out below.',
  ].join(' ');
  // Lines were joined with spaces in the markdown source (soft wraps);
  // the rendered prose should read as a continuous sentence.
  expect(body).toContain(expected);
});
