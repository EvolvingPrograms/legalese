#!/usr/bin/env node
// CLI: read a markdown template, fill values from front-matter / file / stdin /
// flags, and write the rendered .docx.
//
// Output path precedence (highest first):
//   1. --output <path>  / -o <path>      (CLI flag, resolved against CWD)
//   2. $OUTPUT_DIR                        (env: place at <OUTPUT_DIR>/<basename>)
//   3. front-matter `output:`             (absolute as-is, relative resolved against input dir)
//   4. <input-basename>.docx next to the input file
//
// Value precedence (highest first):
//   1. --set key=value flags              (repeatable)
//   2. --values-file <path.yaml>          (or `--values -` for stdin)
//   3. front-matter `values:`             (defaults baked into the template)
//   4. schema[key].default                (per-key fallback)
//
//   legalese my.md
//   legalese my.md --schema             # print the values+schema as YAML, no render
//   legalese my.md --values-file v.yaml
//   legalese my.md --values - <<EOF
//   writer_name: Lewis
//   effective_date: 2026-04-29
//   EOF
//   legalese my.md --set writer_name=Lewis --set effective_date=2026-04-29

import fs from 'node:fs';
import path from 'node:path';

import yaml from 'js-yaml';

import { convertMarkdown } from '@/md/convert';
import { parseValuesYaml } from '@/md/values';
import {
  splitFrontMatter,
  parseSetFlag,
  mergeValues,
  schemaDefaults,
  missingRequired,
  type Values,
} from 'markdsl';
import type { DocxFrontMatter as FrontMatter } from 'markdsl/docx';

interface ParsedArgs {
  inputFile: string | null;
  output: string | null;
  valuesFile: string | null;
  readValuesFromStdin: boolean;
  sets: string[];
  schemaOnly: boolean;
  strict: boolean;
}

function printUsage() {
  console.error('Usage: legalese <input.md> [options]');
  console.error('  --output, -o <path>      Output .docx path (overrides front-matter `output:`)');
  console.error('  --values-file <path>     Load values from a flat YAML map');
  console.error('  --values -               Read values YAML from stdin');
  console.error('  --set key=value          Set a single value (repeatable)');
  console.error('  --schema                 Print values+schema as YAML and exit (no render)');
  console.error('  --strict                 Fail if any required schema keys are missing');
  console.error('  --help, -h               Show this help');
  console.error('  $OUTPUT_DIR              If set (and no --output), place output in this dir');
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {
    inputFile: null,
    output: null,
    valuesFile: null,
    readValuesFromStdin: false,
    sets: [],
    schemaOnly: false,
    strict: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--help' || a === '-h') { printUsage(); process.exit(0); }
    if (a === '--output' || a === '-o') { out.output = argv[++i] ?? null; continue; }
    if (a.startsWith('--output=')) { out.output = a.slice('--output='.length); continue; }
    if (a === '--values-file') { out.valuesFile = argv[++i] ?? null; continue; }
    if (a.startsWith('--values-file=')) { out.valuesFile = a.slice('--values-file='.length); continue; }
    if (a === '--values') {
      const next = argv[++i] ?? null;
      if (next === '-') out.readValuesFromStdin = true;
      else out.valuesFile = next;
      continue;
    }
    if (a === '--set') { const v = argv[++i]; if (v) out.sets.push(v); continue; }
    if (a.startsWith('--set=')) { out.sets.push(a.slice('--set='.length)); continue; }
    if (a === '--schema') { out.schemaOnly = true; continue; }
    if (a === '--strict') { out.strict = true; continue; }
    if (a.startsWith('-')) {
      console.error(`Unknown flag: ${a}`);
      printUsage();
      process.exit(1);
    }
    if (!out.inputFile) { out.inputFile = a; continue; }
    console.error(`Unexpected positional argument: ${a}`);
    process.exit(1);
  }

  return out;
}

/** Resolve the final output path according to the precedence rules above. */
function resolveOutput({ inputAbs, frontMatter, cliOutput }: {
  inputAbs: string;
  frontMatter?: string;
  cliOutput?: string | null;
}): string {
  if (cliOutput) return path.resolve(cliOutput);

  const inputDir  = path.dirname(inputAbs);
  const inputStem = path.basename(inputAbs, path.extname(inputAbs));

  if (process.env.OUTPUT_DIR) {
    const name = frontMatter ? path.basename(frontMatter) : `${inputStem}.docx`;
    return path.resolve(process.env.OUTPUT_DIR, name);
  }
  if (frontMatter) {
    return path.isAbsolute(frontMatter) ? frontMatter : path.resolve(inputDir, frontMatter);
  }
  return path.join(inputDir, `${inputStem}.docx`);
}

function readStdinSync(): string {
  return fs.readFileSync(0, 'utf8');
}

/** Print front-matter `values:` and `schema:` (merged with any incoming values)
 *  as YAML so the user can see what's needed and copy a starting template. */
function printSchema(meta: Record<string, unknown>, mergedValues: Values): void {
  const schema = (meta.schema ?? {}) as Record<string, unknown>;
  const required = Object.entries(schema)
    .filter(([, v]) => typeof v === 'object' && v !== null && (v as Record<string, unknown>).required === true)
    .map(([k]) => k);
  const missing = required.filter((k) => mergedValues[k] == null || mergedValues[k] === '');

  const out = {
    values: mergedValues,
    schema,
    ...(required.length ? { required } : {}),
    ...(missing.length  ? { missing  } : {}),
  };
  process.stdout.write(yaml.dump(out, { lineWidth: 100, noRefs: true }));
}

const args = parseArgs(process.argv.slice(2));
if (!args.inputFile) { printUsage(); process.exit(1); }

const inputAbs = path.resolve(args.inputFile);
const src = fs.readFileSync(inputAbs, 'utf8');
const { meta } = splitFrontMatter<FrontMatter>(src);

// Build the override values map from CLI flags + file/stdin.
const overrides: Values = {};
if (args.valuesFile) {
  const yamlText = fs.readFileSync(path.resolve(args.valuesFile), 'utf8');
  Object.assign(overrides, parseValuesYaml(yamlText));
}
if (args.readValuesFromStdin) {
  Object.assign(overrides, parseValuesYaml(readStdinSync()));
}
for (const setArg of args.sets) {
  const [k, v] = parseSetFlag(setArg);
  overrides[k] = v;
}

if (args.schemaOnly) {
  // Show the user what the template expects, with their overrides already applied.
  const merged = mergeValues(
    schemaDefaults(meta.schema),
    meta.values as Values | undefined,
    overrides,
  );
  printSchema(meta as Record<string, unknown>, merged);
  process.exit(0);
}

if (args.strict) {
  const merged = mergeValues(
    schemaDefaults(meta.schema),
    meta.values as Values | undefined,
    overrides,
  );
  const missing = missingRequired(merged, meta.schema);
  if (missing.length) {
    console.error(`Missing required values: ${missing.join(', ')}`);
    process.exit(1);
  }
}

const output = resolveOutput({
  inputAbs,
  frontMatter: meta.output,
  cliOutput: args.output,
});

fs.mkdirSync(path.dirname(output), { recursive: true });

convertMarkdown(src, {
  output,
  baseDir: path.dirname(inputAbs),
  values: overrides,
  strict: args.strict,
})
  .then((p) => { console.log('Wrote', p); })
  .catch((err) => { console.error(err); process.exit(1); });
