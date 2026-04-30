// Browser/Node-compatible pandoc-wasm runner — same JSON AST shape as the
// system-pandoc `runPandoc`, but loads the WASM binary via the `pandoc-wasm`
// package (~56 MB on disk, ~15 MB gzipped). Listed as an optional peer
// dependency: only callers that import this module need it installed.
//
// Use this when running in the browser, or when you'd rather not require a
// system `pandoc` install. For the Node CLI path, prefer `runPandoc` —
// shelling out to a system pandoc binary is faster and lighter than booting
// a Haskell runtime in WASM.

import type { convert as PandocConvert } from 'pandoc-wasm';

import type { PandocAst } from './types';

const PANDOC_FROM = [
  'markdown',
  '+fancy_lists',
  '+smart',
  '+bracketed_spans',
  '-tex_math_dollars',
  '-tex_math_single_backslash',
].join('');

let cachedConvert: typeof PandocConvert | null = null;

async function loadConvert(): Promise<typeof PandocConvert> {
  if (cachedConvert) return cachedConvert;
  try {
    const mod = await import('pandoc-wasm');
    cachedConvert = mod.convert;
    return cachedConvert;
  } catch {
    throw new Error(
      'pandoc-wasm is not installed. It is an optional peer dependency — ' +
        'install it to use runPandocWasm: `bun add pandoc-wasm` / `npm i pandoc-wasm`.',
    );
  }
}

/** Parse a markdown string into a Pandoc JSON AST via the WASM build of
 *  pandoc. Returns the same `PandocAst` shape as the system-pandoc
 *  `runPandoc`, so callers can swap engines without changing downstream
 *  AST handling. */
export async function runPandocWasm(body: string): Promise<PandocAst> {
  const convert = await loadConvert();
  const result = await convert({ from: PANDOC_FROM, to: 'json' }, body);
  return JSON.parse(result.stdout) as PandocAst;
}
