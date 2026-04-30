// Unit tests for the values pipeline (src/md/values.ts) — pure functions, no
// docx rendering. The integration of these into convertMarkdown is covered by
// tests/markers.test.ts and tests/cli.test.ts.

import { test, expect } from 'bun:test';
import {
  parseValuesYaml,
  parseSetFlag,
  mergeValues,
  schemaDefaults,
  missingRequired,
  deriveLabel,
  smartLabel,
  termLabel,
  termArticle,
  termLong,
  fieldLabel,
} from '@/md/values';

// — parseValuesYaml —

test('parseValuesYaml returns {} for empty / whitespace-only input', () => {
  expect(parseValuesYaml('')).toEqual({});
  expect(parseValuesYaml('   \n  ')).toEqual({});
});

test('parseValuesYaml parses a flat map', () => {
  const out = parseValuesYaml('writer_name: Lewis\neffective_date: 2026-04-29');
  expect(out.writer_name).toBe('Lewis');
  // js-yaml decodes ISO dates as Date objects — verify the key is at least present.
  expect(out).toHaveProperty('effective_date');
});

test('parseValuesYaml rejects non-map input', () => {
  expect(() => parseValuesYaml('- one\n- two')).toThrow(/flat map/);
});

// — parseSetFlag —

test('parseSetFlag splits on the first =', () => {
  expect(parseSetFlag('writer_name=Lewis')).toEqual(['writer_name', 'Lewis']);
});

test('parseSetFlag preserves = in the value', () => {
  expect(parseSetFlag('formula=a=b+c')).toEqual(['formula', 'a=b+c']);
});

test('parseSetFlag throws on missing =', () => {
  expect(() => parseSetFlag('writer_name')).toThrow(/key=value/);
});

// — mergeValues —

test('mergeValues: later sources override earlier', () => {
  const merged = mergeValues(
    { a: 1, b: 2, c: 3 },
    { b: 20, d: 4 },
    { c: 300 },
  );
  expect(merged).toEqual({ a: 1, b: 20, c: 300, d: 4 });
});

test('mergeValues: undefined sources are skipped', () => {
  expect(mergeValues(undefined, { a: 1 }, undefined, { b: 2 })).toEqual({ a: 1, b: 2 });
});

// — schemaDefaults —

test('schemaDefaults pulls .default fields out of object entries', () => {
  expect(schemaDefaults({
    writer_name: 'string',
    governing_law: { type: 'string', default: 'State of Texas' },
    fee: { type: 'number', default: 0 },
  })).toEqual({
    governing_law: 'State of Texas',
    fee: 0,
  });
});

test('schemaDefaults: returns {} for undefined / empty / no defaults', () => {
  expect(schemaDefaults(undefined)).toEqual({});
  expect(schemaDefaults({})).toEqual({});
  expect(schemaDefaults({ writer_name: 'string' })).toEqual({});
});

// — missingRequired —

test('missingRequired flags required keys whose merged value is missing or empty', () => {
  const schema = {
    writer_name:   { type: 'string', required: true },
    effective_date:{ type: 'date',   required: true },
    governing_law: { type: 'string', required: false },
    description:   { type: 'string' },                   // not required
  };
  expect(missingRequired({ writer_name: 'Lewis' }, schema)).toEqual(['effective_date']);
  expect(missingRequired({ writer_name: '' },      schema)).toEqual(['writer_name', 'effective_date']);
  expect(missingRequired({ writer_name: 'L', effective_date: '2026-04-29' }, schema)).toEqual([]);
});

test('missingRequired: bare-string schema entries cannot be required', () => {
  expect(missingRequired({}, { writer_name: 'string' })).toEqual([]);
});

// — deriveLabel —

test('deriveLabel: snake_case → Title Case', () => {
  expect(deriveLabel('assignment_date')).toBe('Assignment Date');
  expect(deriveLabel('writer_name')).toBe('Writer Name');
  expect(deriveLabel('effective_date_v2')).toBe('Effective Date V2');
  expect(deriveLabel('agreement')).toBe('Agreement');
  expect(deriveLabel('a__b')).toBe('A B');  // collapse empty splits
});

// — termLabel —

test('termLabel: schema.term overrides the auto-derived label', () => {
  expect(termLabel('liquidation_event', {
    liquidation_event: { type: 'string', term: 'Liquidation Event (Severance)' },
  })).toBe('Liquidation Event (Severance)');
});

test('termLabel: bare-string schema entry falls back to derived label', () => {
  expect(termLabel('writer_name', { writer_name: 'string' })).toBe('Writer Name');
});

test('termLabel: missing schema falls back to derived label', () => {
  expect(termLabel('writer_name', undefined)).toBe('Writer Name');
  expect(termLabel('writer_name', {})).toBe('Writer Name');
});

// — termArticle —

test('termArticle: defaults to null (no article) when schema does not set article', () => {
  expect(termArticle('agreement', undefined)).toBeNull();
  expect(termArticle('agreement', {})).toBeNull();
  expect(termArticle('agreement', { agreement: 'string' })).toBeNull();
  expect(termArticle('agreement', { agreement: { type: 'string' } })).toBeNull();
});

test('termArticle: schema.article: false → null (no article)', () => {
  expect(termArticle('claude', { claude: { type: 'string', article: false } })).toBeNull();
});

test('termArticle: schema.article string overrides ("a", "an", "such")', () => {
  expect(termArticle('writers_share', {
    writers_share: { term: "Writer's Share", article: 'a' },
  })).toBe('a');
});

// — termLong —

test('termLong: returns schema.long when set', () => {
  expect(termLong('agreement', {
    agreement: { long: 'Exclusive Songwriter Agreement' },
  })).toBe('Exclusive Songwriter Agreement');
});

test('termLong: undefined when no schema or no long field', () => {
  expect(termLong('agreement', undefined)).toBeUndefined();
  expect(termLong('agreement', { agreement: 'string' })).toBeUndefined();
  expect(termLong('agreement', { agreement: { type: 'string' } })).toBeUndefined();
});

// — smartLabel —

test('smartLabel: ASCII apostrophes become typographic right-single-quotes', () => {
  expect(smartLabel("Publisher's Share")).toBe('Publisher’s Share');
  expect(smartLabel("O'Brien")).toBe('O’Brien');
  expect(smartLabel('no apostrophes here')).toBe('no apostrophes here');
});

test('termLabel applies smartLabel to schema.term', () => {
  expect(termLabel('publishers_share', {
    publishers_share: { term: "Publisher's Share" },
  })).toBe('Publisher’s Share');
});

test('termLong applies smartLabel to schema.long', () => {
  expect(termLong('writers_share', {
    writers_share: { long: "the writer's 50% share" },
  })).toBe('the writer’s 50% share');
});

// — fieldLabel —

test('fieldLabel: prefers schema.description', () => {
  expect(fieldLabel('writer_name', {
    writer_name: { type: 'string', description: 'Writer (legal name)', term: 'Writer' },
  })).toBe('Writer (legal name)');
});

test('fieldLabel: falls back to schema.term when no description', () => {
  expect(fieldLabel('liquidation_event', {
    liquidation_event: { term: "Liquidation Event" },
  })).toBe('Liquidation Event');
});

test('fieldLabel: falls back to derived when no schema entry', () => {
  expect(fieldLabel('writer_name', undefined)).toBe('Writer Name');
  expect(fieldLabel('writer_name', {})).toBe('Writer Name');
  expect(fieldLabel('writer_name', { writer_name: 'string' })).toBe('Writer Name');
});
