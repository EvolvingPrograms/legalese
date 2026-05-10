// Phase-2 opt-in test: engine: 'markdsl' routes substitution through
// the markdsl framework. Verifies that flipping the flag on a real
// rendered document produces the same word/document.xml as legacy.
//
// This is the test that catches regressions introduced when Phase 3
// flips the default — if it ever fails, the legacy code stays in
// tree as the escape hatch.

import { test, expect, describe, beforeAll } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { convertMarkdown } from '@/md/convert';
import { OUT, ROOT } from './_helpers';

beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

/** Run the same source twice — once with each engine — and return the
 *  rendered word/document.xml from each. Tests then compare with
 *  expect(...).toBe(...) for byte-identical content. */
async function renderBothEngines(name: string, src: string): Promise<{ legacy: string; markdsl: string }> {
  const legacyOut  = path.resolve(OUT, `${name}.legacy.docx`);
  const markdslOut = path.resolve(OUT, `${name}.markdsl.docx`);
  await convertMarkdown(src, { output: legacyOut,  baseDir: ROOT, engine: 'legacy'  });
  await convertMarkdown(src, { output: markdslOut, baseDir: ROOT, engine: 'markdsl' });
  return {
    legacy:  execSync(`unzip -p "${legacyOut}"  word/document.xml`).toString(),
    markdsl: execSync(`unzip -p "${markdslOut}" word/document.xml`).toString(),
  };
}

describe('engine: "markdsl" — Phase 2 opt-in flag', () => {
  test('renders byte-identically to legacy for a marker-rich body', async () => {
    const src = [
      '---',
      'title: TEST AGREEMENT',
      'schema:',
      '  agreement:',
      '    def: "Master Service Agreement"',
      '  customer:',
      '  contractor:',
      '  party:',
      '    term: Party',
      '  monthly_fee:',
      '    term: Monthly Fee',
      '    required: true',
      '  publishers_share:',
      '    term: "Publisher\'s Share"',
      '    def: "a fifty percent (50%) share"',
      'values:',
      '  customer:    "McDonald\'s USA, LLC"',
      '  contractor:  "Greenline Landscaping, Inc."',
      '  monthly_fee: "$1,850.00"',
      '---',
      '',
      'This {{$the_Agreement}} is between {{$the_Customer}} and',
      '{{$the_Contractor}}, individually {{$a_Party}} and collectively',
      '{{$the_Parties}}. {{The_Contractor}} shall pay {{$the_Monthly_fee}}',
      'subject to {{$the_Publishers_share}}.',
    ].join('\n');
    const { legacy, markdsl } = await renderBothEngines('_marker_rich', src);
    expect(markdsl).toBe(legacy);
  });

  test('renders byte-identically to legacy for trailing-dot swallow', async () => {
    const src = [
      '---',
      'values:',
      '  company: Spellcraft Inc.',
      '---',
      '',
      'Filed by {{=company}}. Today.',
    ].join('\n');
    const { legacy, markdsl } = await renderBothEngines('_dot_swallow', src);
    expect(markdsl).toBe(legacy);
  });

  test('renders byte-identically to legacy for ALL-CAPS title substitution', async () => {
    const src = [
      '---',
      'title: "RESOLUTIONS OF {{=COMPANY}}"',
      'values:',
      '  company: "Sample Records, Inc."',
      '---',
      '',
      'Body.',
    ].join('\n');
    const { legacy, markdsl } = await renderBothEngines('_caps_title', src);
    expect(markdsl).toBe(legacy);
  });

  test('renders byte-identically to legacy for small-caps + plain reference', async () => {
    const src = [
      '---',
      'schema:',
      '  customer:',
      '    term: Customer',
      'values:',
      '  customer: Acme Inc.',
      '---',
      '',
      '{{^Whereas}}, {{the_Customer}} signs the {{!Schedule}}.',
    ].join('\n');
    const { legacy, markdsl } = await renderBothEngines('_smallcaps_ref', src);
    expect(markdsl).toBe(legacy);
  });

  test('renders byte-identically for required + missing → BLANK', async () => {
    const src = [
      '---',
      'schema:',
      '  monthly_fee:',
      '    term: Monthly Fee',
      '    required: true',
      '---',
      '',
      'Pay {{$the_Monthly_fee}} on time.',
    ].join('\n');
    const { legacy, markdsl } = await renderBothEngines('_required_blank', src);
    expect(markdsl).toBe(legacy);
  });
});
