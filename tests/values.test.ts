// Unit tests for legalese's value helpers (src/md/values.ts). Generic
// helpers (mergeValues, schemaDefaults, termLabel, etc.) are tested
// upstream in markdsl/src/schema/{lookup,values}.test.ts; this file
// only covers what stays legalese-specific (parseValuesYaml).

import { test, expect } from 'bun:test';
import { parseValuesYaml } from '@/md/values';

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
