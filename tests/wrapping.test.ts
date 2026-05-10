// Legalese-specific wrapping behaviour. The generic soft-line-break
// and list-formatting tests live in markdsl/src/docx/wrapping.test.ts;
// this file only covers what the legalese marker grammar adds on top.

import { test, expect } from 'bun:test';
import { plain, renderSourceToXml } from './_helpers';

test('soft wraps preserve marker semantics across line breaks', async () => {
  const xml = await renderSourceToXml('_wrap_marker', [
    '---',
    'title: TEST',
    'output: _wrap_marker.docx',
    'schema:',
    '  party: { term: "Party" }',
    '---',
    '',
    'Writer and Company are referred to individually as',
    '{{$a_party}} and collectively as {{$the_parties}}.',
  ].join('\n'));

  expect(plain(xml)).toContain('individually as a “Party” and collectively as the “Parties”.');
});
