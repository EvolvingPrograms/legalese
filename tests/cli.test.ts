// CLI integration tests — exercise scripts/md-to-docx.ts via `bun run` so we
// hit the real argv parsing, value-source merging, stdin handling, and the
// --schema introspection mode.

import { test, expect, beforeAll } from 'bun:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { OUT, ROOT, plain, readDocumentXml } from './_helpers';

const CLI = path.resolve(ROOT, 'scripts/md-to-docx.ts');
const FIXTURES = path.resolve(OUT, 'cli-fixtures');

/** Run the CLI under `bun run` and return stdout, stderr, and exit status. */
function runCli(args: string[], stdin?: string): { status: number; stdout: string; stderr: string } {
  const r = spawnSync('bun', ['run', CLI, ...args], {
    input: stdin,
    encoding: 'utf8',
  });
  return { status: r.status ?? 1, stdout: r.stdout, stderr: r.stderr };
}

/** Write a markdown template into the fixtures dir and return its absolute path. */
function writeTemplate(name: string, src: string): string {
  const p = path.resolve(FIXTURES, name);
  fs.writeFileSync(p, src, 'utf8');
  return p;
}

beforeAll(() => {
  fs.mkdirSync(FIXTURES, { recursive: true });
});

test('--set overrides front-matter values', async () => {
  const tpl = writeTemplate('set-override.md', [
    '---',
    'title: TEST',
    'values:',
    '  writer_name: "Default"',
    '---',
    '',
    'Signed by {{$writer_name}}.',
  ].join('\n'));

  const out = path.resolve(FIXTURES, 'set-override.docx');
  const r = runCli([tpl, '--output', out, '--set', 'writer_name=Lewis']);
  expect(r.status).toBe(0);

  const xml = plain(readDocumentXml(out));
  expect(xml).toContain('Signed by Lewis (the “Writer Name”).');
  expect(xml).not.toContain('Signed by Default');
});

test('--values-file loads a YAML file', async () => {
  const tpl = writeTemplate('values-file.md', [
    '---',
    'title: TEST',
    '---',
    '',
    '{{$writer_name}} signed on {{$effective_date}}.',
  ].join('\n'));

  const valuesPath = path.resolve(FIXTURES, 'values.yaml');
  fs.writeFileSync(valuesPath, 'writer_name: Lewis\neffective_date: "April 29, 2026"\n');

  const out = path.resolve(FIXTURES, 'values-file.docx');
  const r = runCli([tpl, '--output', out, '--values-file', valuesPath]);
  expect(r.status).toBe(0);

  const xml = plain(readDocumentXml(out));
  expect(xml).toContain('Lewis (the “Writer Name”) signed on April 29, 2026 (the “Effective Date”).');
});

test('--values - reads YAML from stdin', async () => {
  const tpl = writeTemplate('values-stdin.md', [
    '---',
    'title: TEST',
    '---',
    '',
    'Hello, {{$writer_name}}.',
  ].join('\n'));

  const out = path.resolve(FIXTURES, 'values-stdin.docx');
  const r = runCli([tpl, '--output', out, '--values', '-'], 'writer_name: Lewis\n');
  expect(r.status).toBe(0);

  const xml = plain(readDocumentXml(out));
  expect(xml).toContain('Hello, Lewis (the “Writer Name”).');
});

test('precedence: --set > --values-file > front-matter values', async () => {
  const tpl = writeTemplate('precedence.md', [
    '---',
    'title: TEST',
    'values:',
    '  a: from-frontmatter',
    '  b: from-frontmatter',
    '  c: from-frontmatter',
    '---',
    '',
    'a={{$a}} b={{$b}} c={{$c}}',
  ].join('\n'));

  const valuesPath = path.resolve(FIXTURES, 'precedence-values.yaml');
  fs.writeFileSync(valuesPath, 'b: from-file\nc: from-file\n');

  const out = path.resolve(FIXTURES, 'precedence.docx');
  const r = runCli([tpl, '--output', out, '--values-file', valuesPath, '--set', 'c=from-set']);
  expect(r.status).toBe(0);

  const xml = plain(readDocumentXml(out));
  expect(xml).toContain('a=from-frontmatter');
  expect(xml).toContain('b=from-file');
  expect(xml).toContain('c=from-set');
});

test('--schema prints values+schema as YAML and skips render', async () => {
  const tpl = writeTemplate('schema.md', [
    '---',
    'title: TEST',
    'output: schema-out.docx',
    'values:',
    '  governing_law: State of Texas',
    'schema:',
    '  writer_name: { type: string, required: true }',
    '  effective_date: date',
    '  governing_law: string',
    '---',
    '',
    'body',
  ].join('\n'));

  const r = runCli([tpl, '--schema']);
  expect(r.status).toBe(0);

  const parsed = yaml.load(r.stdout) as Record<string, any>;
  expect(parsed.values.governing_law).toBe('State of Texas');
  expect(parsed.schema.writer_name).toEqual({ type: 'string', required: true });
  expect(parsed.required).toEqual(['writer_name']);
  expect(parsed.missing).toEqual(['writer_name']);

  // No file should have been written.
  const wouldBeOutput = path.resolve(path.dirname(tpl), 'schema-out.docx');
  expect(fs.existsSync(wouldBeOutput)).toBe(false);
});

test('--schema reflects --set / stdin overrides in `missing`', async () => {
  const tpl = writeTemplate('schema-missing.md', [
    '---',
    'title: TEST',
    'schema:',
    '  writer_name:    { type: string, required: true }',
    '  effective_date: { type: date,   required: true }',
    '---',
    '',
    'body',
  ].join('\n'));

  const r = runCli([tpl, '--schema', '--set', 'writer_name=Lewis']);
  expect(r.status).toBe(0);

  const parsed = yaml.load(r.stdout) as Record<string, any>;
  expect(parsed.missing).toEqual(['effective_date']);
});

test('--strict fails when required values are missing', async () => {
  const tpl = writeTemplate('strict.md', [
    '---',
    'title: TEST',
    'schema:',
    '  writer_name: { type: string, required: true }',
    '---',
    '',
    'body',
  ].join('\n'));

  const out = path.resolve(FIXTURES, 'strict.docx');
  const r = runCli([tpl, '--output', out, '--strict']);
  expect(r.status).not.toBe(0);
  expect(r.stderr).toContain('Missing required values');
  expect(r.stderr).toContain('writer_name');
});

test('--strict succeeds when all required values are provided', async () => {
  const tpl = writeTemplate('strict-ok.md', [
    '---',
    'title: TEST',
    'schema:',
    '  writer_name: { type: string, required: true }',
    '---',
    '',
    '{{$writer_name}}',
  ].join('\n'));

  const out = path.resolve(FIXTURES, 'strict-ok.docx');
  const r = runCli([tpl, '--output', out, '--strict', '--set', 'writer_name=Lewis']);
  expect(r.status).toBe(0);
  expect(fs.existsSync(out)).toBe(true);
});
