// Lettered lists must restart at (a) per list — the legal-doc convention.
// Without a unique numbering instance per list() call, all lettered paragraphs
// share one counter and the second list picks up at (c)(d), the third at (e),
// etc. The fix in src/blocks/paragraphs/index.ts assigns each list() call its
// own numbering instance.

import { test, expect, beforeAll } from 'bun:test';
import fs from 'node:fs';
import { OUT, renderToXml } from './_helpers';

beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

test('three consecutive lettered lists each get a fresh numbering instance', async () => {
  const xml = await renderToXml(
    '_list_reset',
    [
      '## Section 4',
      '',
      'a. first',
      'b. second',
      '',
      '## Section 5',
      '',
      'a. fresh',
      'b. start',
      '',
      '## Section 6',
      '',
      'a. another',
      'b. one',
    ].join('\n'),
  );

  // Each list paragraph references a numbering instance via <w:numId w:val="N"/>.
  // Three separate list() calls must produce three distinct numIds, otherwise
  // docx renders them as one continuous list and the (a)(b)(c) counter doesn't
  // reset between sections.
  const numIds = [...xml.matchAll(/<w:numId\s+w:val="(\d+)"/g)].map((m) => m[1]);
  const unique = new Set(numIds);

  expect(numIds.length).toBe(6); // 2 items × 3 lists
  expect(unique.size).toBe(3);   // 3 distinct list instances
});
