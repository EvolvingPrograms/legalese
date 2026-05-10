// Browser-friendly entry point. Same surface as the default `legalese`
// import, except `convertMarkdown` and `convertMarkdownToBuffer` default
// to the WASM pandoc engine. Importing from this subpath keeps the
// system-pandoc shell-out (which pulls in `node:child_process`) out of
// the bundler graph entirely.
//
// Usage:
//   import { convertMarkdownToBuffer } from 'legalese/browser';
//   const bytes = await convertMarkdownToBuffer(src);   // Uint8Array
//   const blob  = new Blob([bytes],
//     { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
//
// `pandoc-wasm` is an optional peer dependency — install it explicitly to
// use this entry point: `bun add pandoc-wasm` / `npm i pandoc-wasm`.

import {
  convertMarkdown as convertMarkdownNode,
  convertMarkdownToBuffer as convertMarkdownToBufferNode,
  type ConvertOptions,
} from './md/convert';

import { runPandocWasm as runPandocWasmRaw, splitFrontMatter, type PandocWasmConvert } from 'markdsl';

// Resolve `pandoc-wasm` from the consumer's location and inject the
// `convert` function into markdsl. Markdsl's own dynamic
// `import('pandoc-wasm')` resolves relative to its source location;
// when markdsl is consumed via a `file:` dep through symlinks, that
// resolution can miss the consumer's `node_modules`. Resolving here
// (legalese's own location) sidesteps the problem.
let cachedConvert: PandocWasmConvert | null = null;
async function loadConvert(): Promise<PandocWasmConvert> {
  if (cachedConvert) return cachedConvert;
  const mod = (await import('pandoc-wasm')) as unknown as { convert: PandocWasmConvert };
  cachedConvert = mod.convert;
  return cachedConvert;
}

export async function runPandocWasm(body: string) {
  return runPandocWasmRaw(body, await loadConvert());
}

/** Markdown → .docx Buffer, parsing via pandoc-wasm. */
export function convertMarkdownToBuffer(
  srcText: string,
  opts: ConvertOptions = {},
): Promise<Buffer> {
  return convertMarkdownToBufferNode(srcText, { parse: runPandocWasm, ...opts });
}

/** Markdown → docx / json / markdown, parsing via pandoc-wasm. */
export function convertMarkdown(srcText: string, opts: ConvertOptions = {}): ReturnType<typeof convertMarkdownNode> {
  return (convertMarkdownNode as (s: string, o: ConvertOptions) => ReturnType<typeof convertMarkdownNode>)(
    srcText,
    { parse: runPandocWasm, ...opts },
  );
}

export type { ConvertFormat, ParseFn, DocumentJson, ConvertOptions } from './md/convert';
export { substituteMarkers } from './md/substitute';
