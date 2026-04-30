// Verifies that the optional pandoc-wasm engine produces the same Pandoc
// JSON AST as the system pandoc binary for the markdown features our
// renderer cares about (defined-term markers with literal `$`, lettered
// lists, smart quotes, fenced blocks). Skipped if pandoc-wasm isn't
// installed — it's an optional peer dep.

import { test, expect, describe } from 'bun:test';
import { runPandoc } from '@/md/pandoc';
import { runPandocWasm } from '@/md/pandoc-wasm';
import type { PandocAst } from '@/md/types';

let wasmAvailable = true;
try {
  await import('pandoc-wasm');
} catch {
  wasmAvailable = false;
}

const d = wasmAvailable ? describe : describe.skip;

// Strip the `pandoc-api-version` field — it changes between binaries even
// when the AST shape is identical, so comparing it would be flaky.
function normalize(ast: PandocAst): unknown {
  const { 'pandoc-api-version': _v, ...rest } = ast as PandocAst & { 'pandoc-api-version'?: number[] };
  return rest;
}

d('pandoc-wasm engine', () => {
  test('parses a plain paragraph to the same AST as system pandoc', async () => {
    const src = 'Hello, **world**.\n';
    const sys = runPandoc(src);
    const wasm = await runPandocWasm(src);
    expect(normalize(wasm)).toEqual(normalize(sys));
  });

  test('returns a top-level `blocks` array (PandocAst shape)', async () => {
    const ast = await runPandocWasm('# Heading\n\nBody.\n');
    expect(Array.isArray(ast.blocks)).toBe(true);
    expect(ast.blocks[0]?.t).toBe('Header');
    expect(ast.blocks[1]?.t).toBe('Para');
  });

  test('preserves literal `$` in {{$key}} markers (tex_math_dollars disabled)', async () => {
    // The DSL uses {{$key}} for "introduce term"; if pandoc treats `$...$`
    // as inline math, the markers vanish into a Math node. The flags we
    // pass to pandoc-wasm have to match the system pandoc flags or this
    // round-trips wrong.
    const src = 'See {{$Customer}} and {{$Contractor}} below.\n';
    const ast = await runPandocWasm(src);
    const json = JSON.stringify(ast);
    expect(json).toContain('{{$Customer}}');
    expect(json).toContain('{{$Contractor}}');
    expect(json).not.toContain('"Math"');
  });

  test('respects fancy_lists for `a.` lettered enumerations', async () => {
    const src = 'a. first\nb. second\nc. third\n';
    const ast = await runPandocWasm(src);
    const ordered = ast.blocks.find((b) => b.t === 'OrderedList');
    expect(ordered).toBeDefined();
    // OrderedList content shape: [{ listAttributes }, [items...]]
    const attrs = (ordered!.c as [{ 0: number; 1: { t: string }; 2: { t: string } }, unknown[]])[0];
    // [start, numberStyle, numberDelim] — with fancy_lists, lower-alpha
    // resolves to LowerAlpha, not Decimal.
    expect((attrs as unknown as [number, { t: string }, { t: string }])[1].t).toBe('LowerAlpha');
  });

  test('applies +smart (curly quotes, en/em dashes)', async () => {
    const ast = await runPandocWasm('"Quoted" and -- dashed.\n');
    const json = JSON.stringify(ast);
    // SmartPunct emits Quoted nodes rather than literal `"` Str nodes.
    expect(json).toContain('"Quoted"');
  });

  test('parses a fenced `grid` block as a CodeBlock with class `grid`', async () => {
    const src = [
      '```grid',
      'columns:',
      '  - {label: A, key: a, width: 1000}',
      'rows:',
      '  - { a: "x" }',
      '```',
      '',
    ].join('\n');
    const ast = await runPandocWasm(src);
    const code = ast.blocks.find((b) => b.t === 'CodeBlock');
    expect(code).toBeDefined();
    // CodeBlock content: [[id, classes, kvPairs], text]
    const [[, classes]] = code!.c as [[string, string[], unknown[]], string];
    expect(classes).toContain('grid');
  });
});
