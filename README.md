# legal-doc-builder

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
   release](https://github.com/SpellcraftAI/legal-doc-builder/releases).

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

bun add legal-doc-builder      # or: npm i legal-doc-builder
```

```ts
import { build, h2, p, dt, fieldTable, signatureTable } from 'legal-doc-builder';

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
bun add -g legal-doc-builder   # or: npm i -g legal-doc-builder
md-to-docx my-agreement.md
md-to-docx my-agreement.md --output ./out/agreement.docx
OUTPUT_DIR=./out md-to-docx my-agreement.md
```

The CLI takes a markdown file with front-matter (`title`, `output`, `values`)
and the four supported fenced blocks (`fields`, `sig`, `grid`, `grids`). See
[`examples/`](./examples) for ready-to-edit templates and [`SKILL.md`](./SKILL.md)
for the full markdown DSL reference.

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
