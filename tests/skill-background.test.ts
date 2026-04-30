// Pins the "Worked Background paragraph" example documented in SKILL.md.
// Demonstrates the singular + plural-collective intro idiom:
//   (each, {{$a_X}}; collectively, {{$the_Xs}})
// plus plain references and {{!Literal}} alongside it.

import { test, expect, beforeAll } from 'bun:test';
import fs from 'node:fs';
import { OUT, plain, renderSourceToXml } from './_helpers';

beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

const BACKGROUND_TEMPLATE = [
  '---',
  'title: TEST',
  'output: _skill_background.docx',
  'schema:',
  '  customer:   { term: "Customer" }',
  '  contractor: { term: "Contractor" }',
  '  agreement:  { term: "Agreement" }',
  '  services:   { term: "Services" }',
  '  location:   { term: "Location" }',
  '---',
  '',
  '{{Customer}} owns and operates restaurant properties in the Chicago',
  'metropolitan area and requires year-round grounds maintenance at the',
  'properties listed in {{!Schedule A}} (each, {{$a_Location}}; collectively,',
  '{{$the_Locations}}). {{Contractor}} is engaged in the business of commercial',
  'landscaping and grounds maintenance and is willing to provide the',
  '{{Services}} described in this {{Agreement}} at each {{Location}} on the',
  'terms set out below.',
].join('\n');

let body: string;

beforeAll(async () => {
  const xml = await renderSourceToXml('_skill_background', BACKGROUND_TEMPLATE);
  body = plain(xml);
});

// — The singular + plural-collective intro idiom —

test('{{$a_location}}: introduce-no-expansion singular indefinite', () => {
  expect(body).toContain('(each, a “Location”;');
});

test('{{$the_locations}}: introduce-no-expansion plural definite (auto-pluralized)', () => {
  expect(body).toContain('collectively, the “Locations”)');
});

test('singular + plural collective parenthetical reads as one unit', () => {
  expect(body).toContain('(each, a “Location”; collectively, the “Locations”)');
});

// — Plain references alongside the intros —

test('{{Customer}}: plain reference, no article, no styling', () => {
  expect(body).toContain('Customer owns and operates');
});

test('{{Contractor}}: plain reference mid-sentence', () => {
  expect(body).toContain('). Contractor is engaged');
});

test('{{Services}} / {{Agreement}} / {{Location}}: plain refs after intro', () => {
  expect(body).toContain('provide the Services described in this Agreement at each Location');
});

// — Literal inline-styled —

test('{{!Schedule A}}: multi-word literal label, inline-styled', () => {
  expect(body).toContain('listed in “Schedule A”');
});

// — Full paragraph — sanity check the whole sentence flows correctly —

test('full rendered Background paragraph matches expected output', () => {
  const expected = [
    'Customer owns and operates restaurant properties in the Chicago',
    'metropolitan area and requires year-round grounds maintenance at the',
    'properties listed in “Schedule A” (each, a “Location”;',
    'collectively, the “Locations”).',
    'Contractor is engaged in the business of commercial',
    'landscaping and grounds maintenance and is willing to provide the',
    'Services described in this Agreement at each Location on the',
    'terms set out below.',
  ].join(' ');
  expect(body).toContain(expected);
});
