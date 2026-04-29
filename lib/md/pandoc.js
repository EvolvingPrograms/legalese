// Shell out to pandoc to parse markdown into its JSON AST.
// Required extensions:
//   - fancy_lists      (a. b. c. lettered lists)
//   - smart            (curly quotes, en/em dashes, ellipses)
//   - bracketed_spans  (room to grow for inline classes)

import { execSync } from 'node:child_process';

/** @typedef {{ blocks: PandocBlock[], 'pandoc-api-version'?: number[], meta?: unknown }} PandocAst */
/** @typedef {{ t: string, c?: any }} PandocBlock */
/** @typedef {{ t: string, c?: any }} PandocInline */

/** @param {string} body @returns {PandocAst} */
export function runPandoc(body) {
  const out = execSync(
    'pandoc --from=markdown+fancy_lists+smart+bracketed_spans -t json',
    { input: body, encoding: 'utf8' },
  );
  return JSON.parse(out);
}
