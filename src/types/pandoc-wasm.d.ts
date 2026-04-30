// Type declarations for `pandoc-wasm` — the upstream package ships no .d.ts.
// We hand-roll only the surface we use (`convert`); add to this file if
// the codebase grows to call `query` or the legacy `pandoc` wrapper.

declare module 'pandoc-wasm' {
  /** Pandoc options — passed through to the WASM CLI. Fields mirror
   *  pandoc's command-line flags (e.g. `--from=...` becomes `from: '...'`).
   *  Open-ended on purpose: pandoc supports hundreds of options. */
  export interface PandocOptions {
    from?: string;
    to?: string;
    standalone?: boolean;
    'output-file'?: string;
    'extract-media'?: string;
    'table-of-contents'?: boolean;
    [key: string]: unknown;
  }

  /** Result of a `convert` call. `stdout` carries the converted document
   *  for text outputs (e.g. `to: 'json'`); binary outputs land in `files`
   *  under the requested `output-file` name. */
  export interface PandocConvertResult {
    stdout: string;
    stderr: string;
    /** JSON warnings emitted by pandoc, if any. Shape varies. */
    warnings: unknown[];
    /** All files in the WASM filesystem after conversion. Non-binary
     *  contents are strings; binary contents are Blobs. */
    files: Record<string, string | Blob>;
    /** Media files extracted via `--extract-media`, keyed by name. */
    mediaFiles: Record<string, Blob>;
  }

  /** Run pandoc against in-memory input. `stdin` is the document source;
   *  `files` provides any additional resources pandoc needs (templates,
   *  reference docs, etc.) keyed by filename inside the WASM filesystem. */
  export function convert(
    options: PandocOptions,
    stdin?: string,
    files?: Record<string, string | Blob>,
  ): Promise<PandocConvertResult>;
}
