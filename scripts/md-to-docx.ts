#!/usr/bin/env node
// CLI: read a markdown file, write the .docx specified in its front matter.
//
// Output path precedence (highest first):
//   1. --output <path>  / -o <path>     (CLI flag, resolved against CWD)
//   2. $OUTPUT_DIR                       (env: place at <OUTPUT_DIR>/<basename>)
//   3. front-matter `output:`            (absolute as-is, relative resolved against input dir)
//   4. <input-basename>.docx next to the input file
//
// The committed examples set front-matter `output:` to a Claude-web sandbox path,
// so they Just Work on web. Locally, `OUTPUT_DIR=./out node scripts/md-to-docx.js …`
// or `--output ./out/foo.docx` overrides without mutating the example.
//
//   NODE_PATH=/home/claude/.npm-global/lib/node_modules \
//     node scripts/md-to-docx.js path/to/agreement.md [--output target.docx]

import fs from 'node:fs';
import path from 'node:path';

import { convertMarkdown } from '@/md/convert';
import { splitFrontMatter } from '@/md/front-matter';

function printUsage() {
  console.error('Usage: md-to-docx <input.md> [--output <target.docx>]');
  console.error('  --output, -o   Output .docx path (overrides front-matter `output:`)');
  console.error('  --help,   -h   Show this help');
  console.error('  $OUTPUT_DIR    If set (and no --output), place output in this dir');
}

function parseArgs(argv: string[]): { inputFile: string | null; output: string | null } {
  let inputFile: string | null = null;
  let output: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--help' || a === '-h') { printUsage(); process.exit(0); }
    if (a === '--output' || a === '-o') { output = argv[++i] ?? null; continue; }
    if (a.startsWith('--output=')) { output = a.slice('--output='.length); continue; }
    if (a.startsWith('-')) {
      console.error(`Unknown flag: ${a}`);
      printUsage();
      process.exit(1);
    }
    if (!inputFile) { inputFile = a; continue; }
    console.error(`Unexpected positional argument: ${a}`);
    process.exit(1);
  }
  return { inputFile, output };
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

const { inputFile, output: cliOutput } = parseArgs(process.argv.slice(2));
if (!inputFile) { printUsage(); process.exit(1); }

const inputAbs = path.resolve(inputFile);
const src = fs.readFileSync(inputAbs, 'utf8');
const { meta } = splitFrontMatter(src);
const output = resolveOutput({
  inputAbs,
  frontMatter: meta.output,
  cliOutput,
});

fs.mkdirSync(path.dirname(output), { recursive: true });

convertMarkdown(src, { output, baseDir: path.dirname(inputAbs) })
  .then((p) => { console.log('Wrote', p); })
  .catch((err) => { console.error(err); process.exit(1); });
