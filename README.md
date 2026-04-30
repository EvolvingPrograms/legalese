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

### As a global CLI

```bash
bun add -g legalese   # or: npm i -g legalese
md-to-docx my-agreement.md
md-to-docx my-agreement.md --output ./out/agreement.docx
OUTPUT_DIR=./out md-to-docx my-agreement.md
```

The CLI takes a markdown file with front-matter (`title`, `output`, `values`)
and the three supported fenced blocks (`fields`, `sig`, `grid`). See
[`examples/`](./examples) for ready-to-edit templates and [`SKILL.md`](./SKILL.md)
for the full markdown DSL reference.

## Markdown syntax

A template is a markdown file with three pieces: YAML front-matter (schema +
optional values + style), prose with `{{marker}}` substitutions, and fenced
blocks for the structural elements legal documents need (form fields,
signature blocks, schedule grids).

### Front-matter

```yaml
---
title: LANDSCAPING SERVICES AGREEMENT
output: ./Landscaping_Agreement.docx     # optional; CLI flag wins

schema:
  agreement:        { long: "Landscaping Services Agreement" }
  customer:         { long: "Customer" }
  contractor:       { long: "Contractor" }
  effective_date:   { type: date,   required: true }
  monthly_fee:      { term: "Monthly Fee", long: "$1,850.00 per Location" }
  governing_law:    { type: string, default: "State of Delaware" }

values:                       # or pass --values-file foo.yml
  effective_date: "June 1, 2026"
  customer:   "McDonald's USA, LLC"
  contractor: "Greenline Landscaping, Inc."

style:
  font: EB Garamond           # bundled; embeds into the .docx
  size: 12
  margin: 1440                # 1" all sides (twips)
---
```

`schema` declares every defined term and form field. `values` (or
`--values-file`) supplies per-deal data. Run `md-to-docx my.md --schema`
to dump `values: / schema: / required: / missing:` without rendering.

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
case-insensitive; plurals auto-derive (`location` → `Locations`); `a_` /
`an_` auto-flips by the first letter of the resolved term.

```markdown
This {{$the_Agreement}}, dated {{$the_Effective_date}}, is between
{{$the_Customer}} and {{$the_Contractor}}, individually {{$a_Party}} and
collectively {{$the_Parties}}. {{The_Contractor}} shall provide
{{!Services}} at each {{Location}} listed in **{{Schedule_A}}** for
{{$the_Monthly_fee}} per {{Location}}.
```

### Fenced blocks

**`fields`** — labelled form rows for blanks the parties fill in:

````markdown
```fields
effective_date
writer_name
Licensing Fee | fee | prefix=$
Spotify URL | spotify | sub=if credit required
```
````

**`sig`** — signature block. First line is `LEFT_HEADER || RIGHT_HEADER`;
omit `||` for single-party. `[tall]` = a roomy line for handwritten signature.

````markdown
```sig
WRITER || COMPANY
Name      | sig_writer_name   || Entity    | sig_company_entity
Signature [tall]               || Signature [tall]
Date                           || Date
```
````

**`grid`** — styled table (full-grid borders, scaled column widths).
Schedules, inventories, deliverable lists. Rows can be literal, pulled
from `values[key]` via `rows: $key`, or repeated per-entry via `from:`.

````markdown
```grid
columns:
  - {label: '#',         key: '#',       width: 600}
  - {label: 'Service',   key: service,   width: 3500}
  - {label: 'Frequency', key: frequency, width: 1800}
rows:
  - { service: "Mowing",       frequency: "Weekly" }
  - { service: "Snow Removal", frequency: "As-needed" }
```
````

> **Don't use raw markdown tables.** The renderer ignores them — `grid`
> is the only supported tabular form.

> **Nested lists aren't supported.** Use a flat lettered list (`a.`,
> `b.`, `c.` with blank lines between) or a `grid` block.

The full DSL — every marker form, schema field, grid `from:` repeater,
and style override — is documented in [`SKILL.md`](./SKILL.md).

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
scripts/md-to-docx.ts      CLI entry (bundled to dist/)
examples/                  ready-to-edit markdown templates
tests/                     end-to-end generation tests
SKILL.md                   skill manifest — instructions Claude reads at load time
```

## Develop

```bash
bun install
bun test            # end-to-end generation tests
bun run typecheck   # tsc --noEmit
bun run build       # bundle CLI → dist/md-to-docx.js
bun run pack        # build + zip → plugin.zip
```

Strict TypeScript, bundler-mode module resolution, `@/*` path aliases (`@/foo` →
`src/foo`). Tagging `vX.Y.Z` and pushing triggers the [release
workflow](./.github/workflows/release.yml), which builds `plugin.zip` and
attaches it to a GitHub release.

## License

MIT — see [LICENSE](./LICENSE).
