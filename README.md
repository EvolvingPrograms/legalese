# legalese

A TypeScript library for composing signable legal-style `.docx` documents from
markdown. Out of the box it knows about the structures legal documents tend to
need — defined-term shorthand, field/value tables, side-by-side or single-party
signature blocks, and schedule/inventory grids — and renders them in a
consistent house style (Times New Roman, US Letter, full-grid tables).

It also ships as a [Claude skill](https://claude.ai/customize/skills) so Claude
can draft and fill in legal documents end-to-end on top of the library, without
hand-rolling `docx-js` boilerplate.

## Install

### As a Claude skill (recommended for use inside Claude)

The skill teaches Claude *how* to draft legal documents using this library —
picking an appropriate template, filling values, and producing the `.docx`.

1. Build the plugin:

   ```bash
   bun install
   bun run pack       # → plugin.zip
   ```

   Or grab `plugin.zip` from the latest [GitHub
   release](https://github.com/SpellcraftAI/legalese/releases).

2. Open <https://claude.ai/customize/skills> → **Create skill** → **Upload
   skill** → upload `plugin.zip`.

Once installed, Claude reads [`SKILL.md`](./SKILL.md) and uses the bundled CLI
to produce documents from any conversational request ("draft an exclusive
songwriter agreement between …").

### As a Node/Bun library

**Prerequisite:** [`pandoc`](https://pandoc.org/installing.html) must be on your
`PATH` — the markdown frontend shells out to it. (The Claude skill path doesn't
need this; Claude's environment already has pandoc.)

```bash
# macOS
brew install pandoc
# Debian/Ubuntu
sudo apt-get install -y pandoc

bun add legalese      # or: npm i legalese
```

```ts
import { build, h2, p, dt, fieldTable, signatureTable } from 'legalese';

await build({
  title: 'EXCLUSIVE SONGWRITER AGREEMENT',
  output: './Songwriter_Agreement.docx',
  body: [
    p('This Agreement', dt('Agreement'),
      ' is entered into as of the Effective Date stated below.'),
    h2('1. Parties'),
    fieldTable({ effective_date: '', writer: '' }, [
      ['Effective Date', 'effective_date'],
      ['Writer (legal name)', 'writer'],
    ]),
  ],
});
```

The full public surface is re-exported from [`src/index.ts`](./src/index.ts).

## Syntax

The core idea is that **defined terms are variables, not strings**. 

In a typical legal document, "the Customer" appears thirty times across the
body, schedules, and signature block — and changing the customer's name means
thirty hand-edits with thirty chances to miss one. Here you declare the term
*once* in `schema:`, refer to it everywhere by `{{the_Customer}}` /
`{{The_Customer}}` / `{{$the_Customer}}`, and a single edit at the top ripples
through the whole document. 

Plurals derive automatically; the correct article (`a` vs `an`) flips with the
term it precedes; sentence- start capitalization rides on the marker case. Same
idea for static expansions — `monthly_fee.def: "$1,850.00 per Location"` lives
in one place and renders consistently every time it's introduced.

A template is a markdown file with three pieces: YAML front-matter (schema +
optional values + style), prose with `{{marker}}` substitutions, and fenced
blocks for the structural elements legal documents need (form fields, signature
blocks, schedule grids).

### Front-matter

```yaml
---
title: LANDSCAPING SERVICES AGREEMENT
output: ./Landscaping_Agreement.docx     # optional; CLI flag wins

schema:
  agreement:
    def: "Landscaping Services Agreement"
  # `customer` / `contractor` need no `def:` — the auto-derived label
  # (snake → Title Case) already gives "Customer" / "Contractor". The
  # values file supplies the per-deal expansion.
  customer:
  contractor:
  effective_date:
    type: date
    required: true
  services:
    term: "Services"
    def: "certain landscaping and grounds-maintenance
           services described in this Agreement"
  monthly_fee:
    term: "Monthly Fee"
    required: true                       # value supplied per deal
  governing_law:
    type: string
    default: "State of Delaware"

values:                       # or pass --values-file foo.yml
  effective_date: "June 1, 2026"
  customer:      "McDonald's USA, LLC"
  contractor:    "Greenline Landscaping, Inc."
  monthly_fee:   "$1,850.00 per Location"

style:
  font: EB Garamond           # bundled; embeds into the .docx
  size: 12
  margin: 1440                # 1" all sides (twips)
---
```

`schema` declares every defined term and form field. `values` (or
`--values-file`) supplies per-deal data. Run `legalese my.md --schema` to dump
`values: / schema: / required: / missing:` without rendering.

### Defined-term markers

The article rides in the marker prefix; the term comes from schema.

| Marker            | Renders                                  |
|-------------------|------------------------------------------|
| `{{key}}`         | `Key`                                    |
| `{{the_key}}`     | `the Key`                                |
| `{{The_key}}`     | `The Key` *(sentence-start)*             |
| `{{a_key}}`       | `a Key` / `an Key` *(auto by vowel)*     |
| `{{$key}}`        | `<expansion> ***"Key"***`                |
| `{{$the_key}}`    | `<expansion> (the ***"Key"***)`          |
| `{{!Term}}`       | `***"Term"***` *(literal, inline-styled)*|
| `{{^WHEREAS}}`    | small-caps run                           |
| `{{KEY}}`         | uppercased — useful in titles            |

The `$` forms **introduce** a term (with its expansion + parenthetical
definition); plain forms reference it after introduction. Lookups are
case-insensitive; plurals auto-derive (`location` → `Locations`); `a_` / `an_`
auto-flips by the first letter of the resolved term.

```
This {{$the_Agreement}}, dated {{$the_Effective_date}}, is between
{{$the_Customer}} and {{$the_Contractor}}, individually {{$a_Party}} and
collectively {{$the_Parties}}. {{The_Contractor}} shall provide
{{$the_Services}} at each {{Location}} listed in **{{Schedule_A}}** for
{{$the_Monthly_fee}}.
```

Renders (with the schema and values from the front-matter example above):

> This Landscaping Services Agreement (the ***"Agreement"***), dated June
> 1, 2026 (the ***"Effective Date"***), is between McDonald's USA, LLC
> (the ***"Customer"***) and Greenline Landscaping, Inc. (the
> ***"Contractor"***), individually a ***"Party"*** and collectively the
> ***"Parties"***. The Contractor shall provide certain landscaping and
> grounds-maintenance services described in this Agreement (the
> ***"Services"***) at each Location listed in **Schedule A** for
> $1,850.00 per Location (the ***"Monthly Fee"***).

Now rename `customer` to `client` in `schema:` *once* — every reference
above flips to "Client" / "the Client" / "Clients" / "a Client" without
touching the body.

### Fenced blocks

**`fields`** — labelled form rows for blanks the parties fill in:

````
```fields
effective_date
writer_name
Licensing Fee | fee | prefix=$
Spotify URL | spotify | sub=if credit required
```
````

Renders as a two-column field table:

<table width="500">
<tr><td width="180"><b>Effective Date</b></td><td>&nbsp;</td></tr>
<tr><td><b>Writer Name</b></td><td>&nbsp;</td></tr>
<tr><td><b>Licensing Fee</b></td><td>$</td></tr>
<tr><td><b>Spotify URL</b></td><td><i>if credit required</i></td></tr>
</table>

**`sig`** — signature block. First line is `LEFT_HEADER || RIGHT_HEADER`; omit
`||` for single-party. `[tall]` = a roomy line for handwritten signature.

````
```sig
WRITER                         || COMPANY
Name      | sig_writer_name    || Entity    | sig_company_entity
Signature [tall]               || Signature [tall]
Date                           || Date
```
````

Renders as two stacked blocks side-by-side. Each block is its own table
with a centered header spanning both columns, bold labels on the left,
and a roomy signature row sized for ink:

<table align="left" width="310">
<tr><th colspan="2"><div align="center"><b>WRITER</b></div></th></tr>
<tr><td width="90"><b>Name</b></td><td width="220">&nbsp;</td></tr>
<tr><td><b>Title</b></td><td>&nbsp;</td></tr>
<tr><td><b>Signature</b></td><td height="80">&nbsp;</td></tr>
<tr><td><b>Date</b></td><td>&nbsp;</td></tr>
</table>

<img align="left" width="24" height="1" alt="" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"/>

<table align="left" width="310">
<tr><th colspan="2"><div align="center"><b>COMPANY</b></div></th></tr>
<tr><td width="90"><b>Entity</b></td><td width="220">&nbsp;</td></tr>
<tr><td><b>By&nbsp;(name)</b></td><td>&nbsp;</td></tr>
<tr><td><b>Signature</b></td><td height="80">&nbsp;</td></tr>
<tr><td><b>Date</b></td><td>&nbsp;</td></tr>
</table>

<br clear="all"/>

**`grid`** — styled table (full-grid borders, scaled column widths). Schedules,
inventories, deliverable lists. Rows can be literal, pulled from `values[key]`
via `rows: $key`, or repeated per-entry via `from:`.

````
```grid
columns:
  - label: '#'
    key: '#'
    width: 600
  - label: 'Service'
    key: service
    width: 3500
  - label: 'Frequency'
    key: frequency
    width: 1800
rows:
  - service: "Mowing"
    frequency: "Weekly"
  - service: "Snow Removal"
    frequency: "As-needed"
```
````

Renders as a numbered, full-grid table:

<table width="500">
<tr><th width="40"><b>#</b></th><th><b>Service</b></th><th><b>Frequency</b></th></tr>
<tr><td>1</td><td>Mowing</td><td>Weekly</td></tr>
<tr><td>2</td><td>Snow Removal</td><td>As-needed</td></tr>
</table>

> **Don't use raw markdown tables.** The renderer ignores them — `grid` is the
> only supported tabular form.

> **Nested lists aren't supported.** Use a flat lettered list (`a.`, `b.`, `c.`
> with blank lines between) or a `grid` block.

The full DSL — every marker form, schema field, grid `from:` repeater, and style
override — is documented in [`SKILL.md`](./SKILL.md).

## Programmatic API

A single entry point handles everything: pass a `format` and an optional
`output` path. Without an `output` path you get the result in memory; with
one, the result is written to disk and the function resolves to the path.

```ts
import { convertMarkdown } from 'legalese';                  // Node
import { convertMarkdown } from 'legalese/browser';          // Browser (WASM pandoc)

// To .docx:
const buf  = await convertMarkdown(src);                          // Buffer
const path = await convertMarkdown(src, { output: 'nda.docx' });  // path

// To structured JSON — drives interactive UIs:
const doc = await convertMarkdown(src, { format: 'json' });
//   doc.meta     — front-matter (title, style, schema, …)
//   doc.blocks   — Pandoc AST with all {{markers}} resolved
//   doc.values   — merged values (caller > frontmatter > defaults)
//   doc.schema   — the schema as declared, for form generation
//   doc.missing  — required schema keys with no value supplied

// To resolved markdown (for piping to remark / pandoc HTML / your own tooling):
const md = await convertMarkdown(src, { format: 'markdown' });
```

Same options work in both Node and browser entries:

| `format` | No `output` | With `output` |
|---|---|---|
| `'docx'` *(default)* | `Buffer` | writes `.docx`, resolves to path |
| `'json'` | `DocumentJson` | writes `.json`, resolves to path |
| `'markdown'` | resolved markdown `string` | writes `.md`, resolves to path |

Other options: `values` (overrides front-matter `values:`), `title`,
`baseDir`, `strict` (throws on missing required values), and `parse`
(custom markdown parser — defaults to system pandoc in Node, pandoc-wasm
in browser).

### Driving an interactive UI with `format: 'json'`

```tsx
// Re-renders the preview every time the user fills in a value.
// React example, but the shape is framework-agnostic.
import { convertMarkdown, type DocumentJson } from 'legalese/browser';

function Editor({ src }: { src: string }) {
  const [values, setValues] = useState({});
  const [doc, setDoc] = useState<DocumentJson | null>(null);

  useEffect(() => {
    convertMarkdown(src, { format: 'json', values }).then(setDoc);
  }, [src, values]);

  if (!doc) return null;
  return (
    <>
      {/* Render a form from doc.schema, surfacing doc.missing */}
      <Form schema={doc.schema} missing={doc.missing}
            values={values} onChange={setValues} />
      {/* Walk doc.blocks (Pandoc AST) to render the preview */}
      <Preview blocks={doc.blocks} />
      <button onClick={async () => download(await convertMarkdown(src, { values }))}>
        Download .docx
      </button>
    </>
  );
}
```

The blocks have all `{{...}}` markers already resolved into ordinary
`Str` / `Emph` / `Strong` AST nodes — you walk a normal Pandoc tree.
Defined-term parentheticals come through as bold-italic nested in
`Strong`/`Emph`. Required-but-missing values render as a `__________`
placeholder inline so unfilled spots are visible in the preview.

### Browser specifics (`legalese/browser`)

```ts
import { convertMarkdown } from 'legalese/browser';

// pandoc-wasm is an optional peer dep — install it explicitly:
//   npm i pandoc-wasm    (~56 MB on disk, ~15 MB gzipped over the wire)

const bytes = await convertMarkdown(src);
const blob = new Blob([bytes], {
  type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
});
// Hand to <a download>, fetch upload, FileSystemAccess API, etc.
```

The browser entry has the same surface as the Node one; it just defaults
the parser to pandoc-wasm and deliberately never imports
`node:child_process`, so bundlers (Vite, esbuild, Rollup, etc.) don't
need to polyfill the system-pandoc shell-out.

### Lower-level pieces

If you want to walk the AST yourself, substitute markers without
running pandoc, or stop short of producing a docx:

```ts
import {
  splitFrontMatter,    // string  → { meta, body }
  substituteMarkers,   // body    → marker-resolved markdown
  runPandoc,           // body    → PandocAst (Node)
  runPandocWasm,       // body    → PandocAst (browser/Node)
  blockToDocBuilder,   // AST block → BodyEntry[]
  buildToBuffer,       // BodyEntry[] → Buffer
} from 'legalese';

const { meta, body } = splitFrontMatter(src);
const resolved = substituteMarkers(body, { schema: meta.schema, values: meta.values });
const ast = await runPandocWasm(resolved);   // or runPandoc
const entries = ast.blocks.flatMap((b) =>
  blockToDocBuilder(b, meta.values ?? {}, { baseDir: '/' }),
);
const docx = await buildToBuffer({ title: meta.title, body: entries });
```

You can also inject any parser into `convertMarkdown` via the `parse`
option — useful for caching the AST, plugging in a custom markdown
flavour, or running tests against a synthetic AST.

### As a global CLI

```bash
bun add -g legalese   # or: npm i -g legalese
legalese my-agreement.md
legalese my-agreement.md --output ./out/agreement.docx
OUTPUT_DIR=./out legalese my-agreement.md
```

The CLI takes a markdown file with front-matter (`title`, `output`, `values`)
and the three supported fenced blocks (`fields`, `sig`, `grid`). See
[`examples/`](./examples) for ready-to-edit templates and
[`SKILL.md`](./SKILL.md) for the full markdown DSL reference.

## Repo layout

```
src/                       pure TypeScript library
  index.ts                 public barrel
  types.ts                 cross-cutting types (BodyEntry)
  lib/                     build, runs, defaults, internal
  blocks/                  things that produce a docx Paragraph or Table
    paragraphs/            p, h1, h2, list, spacer, raw
    field-table/
    grid-table/
    signature-table/
  md/                      markdown frontend (pandoc → AST → builder)
scripts/legalese.ts      CLI entry (bundled to dist/)
examples/                  ready-to-edit markdown templates
tests/                     end-to-end generation tests
SKILL.md                   skill manifest — instructions Claude reads at load time
```

## Develop

```bash
bun install
bun test            # end-to-end generation tests
bun run typecheck   # tsc --noEmit
bun run build       # bundle CLI → dist/legalese.js
bun run pack        # build + zip → plugin.zip
```

Strict TypeScript, bundler-mode module resolution, `@/*` path aliases (`@/foo` →
`src/foo`). Tagging `vX.Y.Z` and pushing triggers the [release
workflow](./.github/workflows/release.yml), which builds `plugin.zip` and
attaches it to a GitHub release.

## License

MIT — see [LICENSE](./LICENSE).
