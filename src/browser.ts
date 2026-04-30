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
  type ParseFn,
} from './md/convert';

export { runPandocWasm } from './md/pandoc-wasm';
import { runPandocWasm } from './md/pandoc-wasm';

/** Markdown → .docx Buffer, parsing via pandoc-wasm. Pure: never touches
 *  the filesystem; safe in the browser and in serverless handlers. */
export function convertMarkdownToBuffer(
  srcText: string,
  opts: ConvertOptions = {},
): Promise<Buffer> {
  return convertMarkdownToBufferNode(srcText, { parse: runPandocWasm, ...opts });
}

/** Markdown → .docx written to `output`, parsing via pandoc-wasm. Node
 *  only — the browser entry exposes this for symmetry, but calling it
 *  outside Node will throw on `fs.writeFileSync`. Prefer
 *  `convertMarkdownToBuffer` in the browser. */
export function convertMarkdown(
  srcText: string,
  opts: ConvertOptions = {},
): Promise<string> {
  return convertMarkdownNode(srcText, { parse: runPandocWasm, ...opts });
}

export * from './blocks';
export * from './types';
export { buildToBuffer, build } from './lib/build';

export type { BodyEntry } from './types';
export type { DocStyleOpts, BuildArgs } from './lib/build';
export type { ConvertOptions, ParseFn };

// Import directly from leaf modules — going through ./md (the barrel)
// would re-export ./md/pandoc, which pulls in `node:child_process` and
// defeats the point of a browser-friendly entry.
export { splitFrontMatter } from './md/front-matter';