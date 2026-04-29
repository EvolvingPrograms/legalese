# legal-doc-builder

An installable Claude plugin (skill) for generating signable .docx
legal/business documents — agreements, assignments, licenses, NDAs, addenda,
schedules — in a consistent house style. When this skill is loaded, Claude can
produce polished, fillable Word documents end-to-end from a short user request,
instead of writing raw `docx-js` boilerplate by hand.

The plugin ships as a single `plugin.zip` containing:

- A bundled CLI (`dist/md-to-docx.js`) — one self-contained file, no
  `node_modules` install step, callable as `node $SKILL_DIR my-doc.md`.
- The skill manifest ([`SKILL.md`](./SKILL.md)) — instructs Claude when and how
  to use the helpers.
- Worked examples ([`examples/`](./examples)) — full markdown templates Claude
  copies and edits.
- The pure-TS library ([`src/`](./src)) — for programmatic use, or for
  re-bundling.

## Installing the plugin

Build the zip from source:

```bash
bun install      # dev deps
bun run pack     # → plugin.zip
```

Then load `plugin.zip` into your Claude environment per its plugin/skill loader
instructions. Once mounted at `$SKILL_DIR` (typically `/mnt/skills/...`), Claude
follows the directions in [`SKILL.md`](./SKILL.md) to produce documents.

## How Claude uses it

For each request, Claude:

1. Picks an example from [`examples/`](./examples) closest to the user's
   document type.
2. Edits the front-matter `values:` map (party names, dates, governing law, …)
   and the body (replacing placeholder prose with the user's content).
3. Runs the bundled CLI: `node $SKILL_DIR my-agreement.md`.
4. Validates the output and presents the `.docx` (and source `.md`) to the user.

The full authoring DSL — front-matter shape, supported markdown features, and
the four custom fenced blocks (`fields`, `sig`, `grid`, `grids`) — is documented
in [`SKILL.md`](./SKILL.md).

## Library use (outside the plugin)

The same helpers are usable as a regular TS library if you want to generate docs
programmatically rather than through Claude:

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
package.json               main → dist/, module/types → src/, bin → md-to-docx
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
`src/foo`).

## License

MIT.
