// Defined-term markers `{{Term}}` must render with curly quotes (“ ”) so the
// output is consistent with pandoc's smart-quote treatment of explicit
// `*"Parties"*` markdown. The earlier renderer hardcoded straight quotes.
//
// Pandoc tokenizes multi-word `{{Foo Bar}}` as Str + Space + Str — the second
// case below pins the cross-token flattening fix in src/md/inlines.ts.

import { test, expect, beforeAll } from 'bun:test';
import fs from 'node:fs';
import { OUT, renderToXml } from './_helpers';

beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

test('single-word {{Term}} renders with curly quotes', async () => {
  const xml = await renderToXml(
    '_curly_quotes_single',
    'This Agreement {{Agreement}} is entered into today.',
  );
  expect(xml).toContain('“Agreement”');
  expect(xml).not.toMatch(/"Agreement"/);
});

test('multi-word {{Term}} (spans Str+Space tokens) renders with curly quotes', async () => {
  const xml = await renderToXml(
    '_curly_quotes_multi',
    'The Human Writer {{Human Writer}} signs below.',
  );
  expect(xml).toContain('“Human Writer”');
  expect(xml).not.toMatch(/"Human Writer"/);
});
