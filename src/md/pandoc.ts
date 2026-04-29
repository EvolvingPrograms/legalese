// Shell out to pandoc to parse markdown into its JSON AST.
//
// Enabled:
//   - fancy_lists                 a. b. c. lettered lists
//   - smart                       curly quotes, en/em dashes, ellipses
//   - bracketed_spans             room to grow for inline classes
//
// Disabled:
//   - tex_math_dollars / single_backslash
//        Pandoc's default markdown reads `$x$` as inline math. Our value-
//        substitute marker `{{$key}}` contains a literal `$`, which pandoc
//        would otherwise pair with a downstream `$` and eat everything in
//        between as a math block. Disabling these extensions keeps `$` as
//        a plain character so our markers parse correctly.

import { execSync } from 'node:child_process';

import type { PandocAst } from './types';

const PANDOC_FROM = [
  'markdown',
  '+fancy_lists',
  '+smart',
  '+bracketed_spans',
  '-tex_math_dollars',
  '-tex_math_single_backslash',
].join('');

/** Parse a markdown string into a Pandoc JSON AST by shelling out to `pandoc`. */
export function runPandoc(body: string): PandocAst {
  const out = execSync(
    `pandoc --from=${PANDOC_FROM} -t json`,
    { input: body, encoding: 'utf8' },
  );
  return JSON.parse(out) as PandocAst;
}
