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

/** Markdown → docx / json / markdown, parsing via pandoc-wasm. Same
 *  shape as the Node `convertMarkdown` (format + optional output) but
 *  pre-bound to the WASM engine. Pass an `output` path only when running
 *  in Node — `fs.writeFileSync` will throw in the browser. Default
 *  format is `'docx'`; pass `format: 'json'` to drive interactive UIs.
 *
 *  See `ConvertOptions` and `DocumentJson` for the full contract. */
export function convertMarkdown(srcText: string, opts: ConvertOptions = {}): ReturnType<typeof convertMarkdownNode> {
  // Cast to satisfy the overloaded signature; we just defer to the Node
  // implementation with the WASM parser pre-bound.
  return (convertMarkdownNode as (s: string, o: ConvertOptions) => ReturnType<typeof convertMarkdownNode>)(
    srcText,
    { parse: runPandocWasm, ...opts },
  );
}

export * from './blocks';
export * from './types';
export { buildToBuffer, build } from './lib/build';

export type { BodyEntry } from './types';
export type { DocStyleOpts, BuildArgs } from './lib/build';
export type { ConvertFormat, ParseFn, DocumentJson } from './md/convert';
export type { ConvertOptions };
export { substituteMarkers } from './md/substitute';

// Import directly from leaf modules — going through ./md (the barrel)
// would re-export ./md/pandoc, which pulls in `node:child_process` and
// defeats the point of a browser-friendly entry.
export { splitFrontMatter } from './md/front-matter';