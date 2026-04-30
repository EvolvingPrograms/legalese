#!/usr/bin/env bun
// Fetch variable-axis TTFs (or the upright variable file when the family
// only ships variable) for our bundled font families. Pulled from the
// google/fonts repo's main branch via raw URLs. Run: `bun scripts/fetch-fonts.ts`
//
// We embed only the upright/regular file per family — docx-js's FontOptions
// API doesn't differentiate between regular/bold/italic, so passing multiple
// files with the same name produces duplicate <w:font> entries. Word
// synthesizes bold/italic from the regular; modern Word may interpolate
// along the embedded TTF's `wght` axis for true designed bold weight.
//
// The dolanmiu/docx#3019 filename fix (PR #3428) is required for these
// fonts to embed cleanly without Word's recovery prompt.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface FontSpec {
  family: string;          // user-facing name (matches style.font in front-matter)
  url: string;             // GitHub raw URL to the upright variable TTF
  outFile: string;         // local filename in fonts/
}

const RAW = 'https://raw.githubusercontent.com/google/fonts/main';

const FAMILIES: FontSpec[] = [
  // EB Garamond — variable wght axis (400–800).
  {
    family: 'EB Garamond',
    url: `${RAW}/ofl/ebgaramond/EBGaramond%5Bwght%5D.ttf`,
    outFile: 'EBGaramond.ttf',
  },
  // Source Serif 4 — variable opsz + wght axes.
  {
    family: 'Source Serif 4',
    url: `${RAW}/ofl/sourceserif4/SourceSerif4%5Bopsz%2Cwght%5D.ttf`,
    outFile: 'SourceSerif4.ttf',
  },
  // Crimson Pro — variable wght axis (200–900).
  {
    family: 'Crimson Pro',
    url: `${RAW}/ofl/crimsonpro/CrimsonPro%5Bwght%5D.ttf`,
    outFile: 'CrimsonPro.ttf',
  },
  // PT Serif — static only (no variable in google/fonts). Bundle the regular.
  {
    family: 'PT Serif',
    url: `${RAW}/ofl/ptserif/PT_Serif-Web-Regular.ttf`,
    outFile: 'PTSerif-Regular.ttf',
  },
  // Libre Baskerville — variable wght axis (400–700).
  {
    family: 'Libre Baskerville',
    url: `${RAW}/ofl/librebaskerville/LibreBaskerville%5Bwght%5D.ttf`,
    outFile: 'LibreBaskerville.ttf',
  },
];

const OUT_DIR = path.resolve(__dirname, '..', 'fonts');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function fetchOne(spec: FontSpec): Promise<number> {
  const res = await fetch(spec.url);
  if (!res.ok) throw new Error(`Failed ${res.status} ${spec.url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(OUT_DIR, spec.outFile), buf);
  process.stdout.write(`  ${spec.outFile.padEnd(40)} ${(buf.byteLength / 1024).toFixed(1).padStart(7)} KB\n`);
  return buf.byteLength;
}

// Clean prior fetches so we don't leave stale files behind.
for (const f of fs.readdirSync(OUT_DIR)) {
  if (f.endsWith('.ttf')) fs.unlinkSync(path.join(OUT_DIR, f));
}

let total = 0;
for (const fam of FAMILIES) {
  console.log(`${fam.family}:`);
  total += await fetchOne(fam);
}

const manifest = FAMILIES.map((f) => ({ family: f.family, files: [f.outFile] }));
fs.writeFileSync(
  path.join(OUT_DIR, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
);

console.log(`\nTotal: ${(total / 1024 / 1024).toFixed(2)} MB across ${FAMILIES.length} families`);
