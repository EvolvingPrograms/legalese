// Tests for the unified `convertMarkdown(src, { format })` API:
//   - format: 'json'      → DocumentJson { meta, blocks, values, schema, missing }
//   - format: 'markdown'  → marker-resolved markdown string
//   - format: 'docx'      → Buffer (no output) or path (with output)
//
// The JSON path is the primitive driving interactive UIs: a React app
// reads `schema` + `missing` to render a fillable form, walks `blocks`
// to render a preview, and re-calls on every input change.

import { test, expect, beforeAll, describe } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { convertMarkdown, substituteMarkers } from '@/index';
import { OUT, ROOT } from './_helpers';

beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

const SRC_BASIC = [
  '---',
  'title: TEST',
  'schema:',
  '  agreement:',
  '    def: "Test Agreement"',
  '  customer:',
  '  monthly_fee:',
  '    term: Monthly Fee',
  '    required: true',
  'values:',
  '  customer: "Acme Corp"',
  '---',
  '',
  'This {{$the_Agreement}} is between {{$the_Customer}} for {{$the_Monthly_fee}}.',
  '',
  '1. **First.** A numbered item.',
].join('\n');

describe('substituteMarkers (primitive)', () => {
  test('introduce form with value: `<value> (the ***"Term"***)`', () => {
    const out = substituteMarkers('Hello {{$the_Customer}}.', {
      schema: { customer: { term: 'Customer' } },
      values: { customer: 'Acme Corp' },
    });
    expect(out).toContain('Acme Corp (the ***“Customer”***)');
  });

  test('introduce form composes value + def with a comma when both are set', () => {
    // Standard legal-pattern: party name followed by entity-type qualifier.
    const out = substituteMarkers('{{$the_Company}} hereby certifies.', {
      schema: {
        company: {
          def: 'a Delaware corporation',
        },
      },
      values: { company: 'Evolving Programs, Inc.' },
    });
    expect(out).toContain(
      'Evolving Programs, Inc., a Delaware corporation (the ***“Company”***)',
    );
  });

  test('introduce form with def fallback', () => {
    const out = substituteMarkers('Use {{$the_Agreement}}.', {
      schema: { agreement: { def: 'Test Agreement' } },
      values: {},
    });
    expect(out).toContain('Test Agreement (the ***“Agreement”***)');
  });

  test('introduce form, required + missing → fill-in blank', () => {
    const out = substituteMarkers('Pay {{$the_Monthly_fee}}.', {
      schema: { monthly_fee: { term: 'Monthly Fee', required: true } },
      values: {},
    });
    expect(out).toContain('__________________ (the ***“Monthly Fee”***)');
  });

  test('introduce form, no value AND no def AND not required → inline-styled', () => {
    const out = substituteMarkers('individually {{$a_Party}}.', {
      schema: { party: { term: 'Party' } },
      values: {},
    });
    expect(out).toContain('a ***“Party”***');
    expect(out).not.toContain('(');
  });

  test('plain reference: `the Customer`', () => {
    const out = substituteMarkers('Pay {{the_Customer}}.', {
      schema: { customer: { term: 'Customer' } },
      values: {},
    });
    expect(out).toBe('Pay the Customer.');
  });

  test('sentence-start reference: `The Customer`', () => {
    const out = substituteMarkers('{{The_Customer}} signs first.', {
      schema: { customer: { term: 'Customer' } },
      values: {},
    });
    expect(out).toBe('The Customer signs first.');
  });

  test('literal define: `(the ***"Term"***)` for unknown keys', () => {
    // Capitalized single word with no schema hit → literal-define (parens).
    const out = substituteMarkers('This {{Agreement}} is binding.', { values: {} });
    expect(out).toContain('(the ***“Agreement”***)');
  });

  test('capitalized single word WITH schema hit renders as reference (label only)', () => {
    // Backwards-compat carry-over from the docx pipeline: when schema has
    // the lowercased key, `{{Agreement}}` resolves through the reference
    // path, not literal-define.
    const out = substituteMarkers('This {{Agreement}} is binding.', {
      schema: { agreement: { def: 'Test Agreement' } },
      values: {},
    });
    expect(out).toBe('This Agreement is binding.');
  });

  test('literal inline-styled: `***"Term"***`', () => {
    const out = substituteMarkers('Defining {{!Services}} below.', {});
    expect(out).toContain('***“Services”***');
    expect(out).not.toContain('(');
  });

  // — Bare value substitution: {{=key}} —
  // Pure value substitute, no parens, no styling. Resolves values → def
  // → label so it gracefully degrades to the term name in a draft.

  test('{{=key}} substitutes the resolved value verbatim', () => {
    const out = substituteMarkers('Filed by {{=customer}} today.', {
      schema: { customer: { term: 'Customer' } },
      values: { customer: 'Acme Inc.' },
    });
    expect(out).toBe('Filed by Acme Inc. today.');
  });

  test('{{=KEY}} uppercases the substituted value', () => {
    const out = substituteMarkers('RESOLUTIONS OF {{=COMPANY}}', {
      schema: { company: { term: 'Company' } },
      values: { company: 'Sample Records, Inc.' },
    });
    expect(out).toBe('RESOLUTIONS OF SAMPLE RECORDS, INC.');
  });

  test('{{=Key}} capitalizes the first letter of the value', () => {
    const out = substituteMarkers('{{=customer}} signs first.', {
      values: { customer: 'acme inc.' },
    });
    // Lowercase marker → as-is.
    expect(out).toBe('acme inc. signs first.');
    const out2 = substituteMarkers('{{=Customer}} signs first.', {
      values: { customer: 'acme inc.' },
    });
    expect(out2).toBe('Acme inc. signs first.');
  });

  test('{{=key}} falls back through def then label when no value supplied', () => {
    const out = substituteMarkers('Filed by {{=customer}} today.', {
      schema: { customer: { def: 'a Delaware corporation' } },
    });
    expect(out).toBe('Filed by a Delaware corporation today.');

    // No value, no def → label (auto-derived).
    const out2 = substituteMarkers('Filed by {{=customer}} today.', {});
    expect(out2).toBe('Filed by Customer today.');
  });

  test('{{=key}} does NOT add parens or styling', () => {
    const out = substituteMarkers('{{=Company}}', {
      values: { company: 'Acme Inc.' },
    });
    expect(out).not.toContain('(');
    expect(out).not.toContain('*');
    expect(out).not.toContain('"');
    expect(out).not.toContain('“');
  });

  test('all-caps marker uppercases the label (body-position behavior)', () => {
    // In body position, `{{COMPANY}}` uppercases the label — same as the
    // docx pipeline. (Title position uses value/def/term fallback; that's
    // handled separately in convert.ts substituteTitleMarkers.)
    const out = substituteMarkers('{{COMPANY}}', {
      schema: { company: { def: 'Acme Inc.' } },
      values: {},
    });
    expect(out).toBe('COMPANY');
  });

  test('small-caps emit as <span class="legalese-smallcaps">', () => {
    const out = substituteMarkers('{{^WHEREAS}}, foo.', {});
    expect(out).toBe('<span class="legalese-smallcaps">WHEREAS</span>, foo.');
  });
});

describe('convertMarkdown { format: "json" }', () => {
  test('returns a DocumentJson with meta / blocks / values / schema / missing', async () => {
    const doc = await convertMarkdown(SRC_BASIC, { format: 'json', baseDir: ROOT });
    expect(typeof doc).toBe('object');
    expect(doc).not.toBeNull();
    if (typeof doc === 'string' || Buffer.isBuffer(doc)) throw new Error('wrong shape');

    expect(doc.meta.title).toBe('TEST');
    expect(Array.isArray(doc.blocks)).toBe(true);
    expect(doc.blocks.length).toBeGreaterThan(0);
    expect(doc.values.customer).toBe('Acme Corp');
    expect(doc.schema?.agreement).toBeDefined();
    expect(doc.missing).toContain('monthly_fee');
  });

  test('blocks have markers resolved into Str / Emph / Strong inline nodes', async () => {
    const doc = await convertMarkdown(SRC_BASIC, { format: 'json', baseDir: ROOT });
    if (typeof doc === 'string' || Buffer.isBuffer(doc)) throw new Error('wrong shape');

    const json = JSON.stringify(doc.blocks);
    // No `{{...}}` markers should leak into the AST.
    expect(json).not.toContain('{{');
    expect(json).not.toContain('}}');

    // Resolved values appear as Str nodes (pandoc tokenizes on whitespace,
    // so "Acme Corp" becomes Str "Acme" + Space + Str "Corp").
    expect(json).toContain('"Acme"');
    expect(json).toContain('"Corp"');
    expect(json).toContain('"Test"');
    expect(json).toContain('"Agreement"');
    expect(json).toContain('Customer');

    // Required-but-missing renders the BLANK placeholder.
    expect(json).toContain('__________________');
  });

  test('with `output:` writes JSON to disk and resolves to the path', async () => {
    const out = path.resolve(OUT, '_fmt_json.json');
    const result = await convertMarkdown(SRC_BASIC, {
      format: 'json',
      output: out,
      baseDir: ROOT,
    });
    expect(result).toBe(out);
    expect(fs.existsSync(out)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(parsed.meta.title).toBe('TEST');
    expect(parsed.values.customer).toBe('Acme Corp');
  });

  test('caller-supplied `values` overrides front-matter values', async () => {
    const doc = await convertMarkdown(SRC_BASIC, {
      format: 'json',
      values: { customer: 'Override Co.', monthly_fee: '$5,000' },
      baseDir: ROOT,
    });
    if (typeof doc === 'string' || Buffer.isBuffer(doc)) throw new Error('wrong shape');
    expect(doc.values.customer).toBe('Override Co.');
    expect(doc.missing).not.toContain('monthly_fee');
    const json = JSON.stringify(doc.blocks);
    expect(json).toContain('"Override"');     // tokenized
    expect(json).toContain('$5,000');
  });
});

describe('convertMarkdown { format: "markdown" }', () => {
  test('returns marker-resolved markdown source (no `{{...}}` left)', async () => {
    const out = await convertMarkdown(SRC_BASIC, {
      format: 'markdown',
      values: { monthly_fee: '$1,200' },
    });
    expect(typeof out).toBe('string');
    if (typeof out !== 'string') throw new Error('wrong shape');
    expect(out).not.toContain('{{');
    expect(out).toContain('Acme Corp (the ***“Customer”***)');
    expect(out).toContain('$1,200 (the ***“Monthly Fee”***)');
  });

  test('with `output:` writes the .md to disk', async () => {
    const out = path.resolve(OUT, '_fmt_md.md');
    const result = await convertMarkdown(SRC_BASIC, {
      format: 'markdown',
      output: out,
    });
    expect(result).toBe(out);
    const text = fs.readFileSync(out, 'utf8');
    expect(text).not.toContain('{{');
  });
});

describe('convertMarkdown { format: "docx" } (default)', () => {
  test('without `output:`, returns a Buffer', async () => {
    const buf = await convertMarkdown(SRC_BASIC, { baseDir: ROOT });
    expect(Buffer.isBuffer(buf)).toBe(true);
    if (!Buffer.isBuffer(buf)) throw new Error('wrong shape');
    expect(buf.length).toBeGreaterThan(1000);
  });

  test('with `output:`, writes file and resolves to path', async () => {
    const out = path.resolve(OUT, '_fmt_docx.docx');
    const result = await convertMarkdown(SRC_BASIC, {
      format: 'docx',
      output: out,
      baseDir: ROOT,
    });
    expect(result).toBe(out);
    const xml = execSync(`unzip -p "${out}" word/document.xml`).toString();
    expect(xml).toContain('Acme Corp');
  });
});
