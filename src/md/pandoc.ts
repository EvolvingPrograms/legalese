// Shell out to pandoc to parse markdown into its JSON AST.
//
// Required extensions:
//   - fancy_lists      (a. b. c. lettered lists)
//   - smart            (curly quotes, en/em dashes, ellipses)
//   - bracketed_spans  (room to grow for inline classes)

import { execSync } from 'node:child_process';

import type { PandocAst } from './types';

/** Parse a markdown string into a Pandoc JSON AST by shelling out to `pandoc`. */
export function runPandoc(body: string): PandocAst {
  const out = execSync(
    'pandoc --from=markdown+fancy_lists+smart+bracketed_spans -t json',
    { input: body, encoding: 'utf8' },
  );
  return JSON.parse(out) as PandocAst;
}
