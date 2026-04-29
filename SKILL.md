---
name: legal-doc-builder
description: "Build signable, professional .docx legal/business documents (agreements, assignments, licenses, addenda, NDAs, simple contracts) from markdown with custom fenced blocks for field tables, signature blocks, and schedule grids. Sensible defaults are baked in (Times New Roman, US Letter, full-grid tables, side-by-side signature blocks). Use this skill whenever the user asks for a contract, agreement, license, assignment, addendum, NDA, schedule, or any signable Word document, even if they don't say 'docx' — they almost always want a polished, fillable file rather than markdown. Especially relevant when they want fields prefilled from a values block, when they show an existing template and want to extend or replicate its style, or when the document needs grid tables, merged-cell signature blocks, or a Schedule A. Defer to this skill instead of writing raw docx-js code by hand."
---

# Legal document builder

Markdown in, signable .docx out. Pandoc handles the prose; custom fenced blocks (`fields`, `sig`, `grid`, `grids`) handle the structured pieces. House style is baked in — Times New Roman, 12pt, 1.5 line spacing, justified, US Letter, full-grid tables.

Use it for agreements, assignments, licenses, NDAs, addenda, work-for-hire releases, sample clearances, schedules. Skip it for plain prose (use the `docx` skill), spreadsheets (`xlsx`), or PDFs (`pdf`).

## Run it

The skill ships a single self-contained bundle. `node $SKILL_DIR <input.md>` resolves to the bundle via `package.json`'s `main` field — no `node_modules`, no `NODE_PATH`, no install step. `$SKILL_DIR` is wherever the skill is mounted (typically `/mnt/skills/...`); substitute the real path.

```bash
mkdir -p /home/claude/work && cd /home/claude/work
cp $SKILL_DIR/examples/songwriter-agreement.md ./my-agreement.md
# edit my-agreement.md (front-matter values + body), then:
node $SKILL_DIR my-agreement.md
```

The bundle inlines `docx` and `js-yaml`, so it runs from any cwd against any input path. `pandoc` is the only external dependency (already at `/usr/bin/pandoc` in this environment).

Output path precedence (highest first): `--output <path>` flag → `$OUTPUT_DIR` env → front-matter `output:` → `<input-basename>.docx` next to the input.

## Document shape

```markdown
---
title: EXCLUSIVE SONGWRITER AGREEMENT
output: /home/claude/work/Songwriter_Agreement.docx
values:
  effective_date: ""
  writer_name: ""
  governing_law: "State of Texas"
  sig_writer_name: ""
  sig_company_entity: ""
---

This Exclusive Songwriter Agreement {{Agreement}} is entered into as of the
Effective Date stated below, by and between the Writer {{Writer}} and the
Company {{Company}} identified in Section 1.

## 1. Parties and Effective Date

​```fields
Effective Date | effective_date
Writer (legal name) | writer_name
Governing law | governing_law
​```

## 2. Background

Substantive prose flows as natural paragraphs. **Bold**, *italic*, ***bold-italic***
all work. Smart quotes and apostrophes are auto-applied.

## 14. Signatures {.pageBreak}

​```sig
WRITER || COMPANY
Name | sig_writer_name        || Entity     | sig_company_entity
Signature [tall]              || Signature [tall]
Date                          || Date
​```
```

## Markdown features

| Source | Effect |
|--------|--------|
| `# Title` | Centered Heading 1 |
| `## Section` | Section heading (Heading 2) |
| `## Section {.pageBreak}` | Section heading starting a new page |
| `**bold**` / `*italic*` / `***both***` | Inline formatting |
| `{{Term}}` | Defined term — renders as `(the *"Term"*)` |
| `1. 2. 3.` or `a. b. c.` | Lettered sublist `(a) (b) (c)` |
| `"text"`, `Writer's`, `--`, `---` | Smart quotes, en/em dashes — auto |
| `---` (hr) | Vertical spacer |

## Fenced blocks

**`fields` — field/values table.** One row per line, pipe-separated. Optional third column for `prefix=...` or `sub=...`:

```
​```fields
Effective Date | effective_date
Licensing Fee | fee | prefix=$
Spotify URL | spotify | sub=if credit required
​```
```

**`sig` — signature block.** First line is the headers separated by `||`. Each subsequent line is `Label | key | [tall]?` per side. Use `[tall]` for handwritten signature rows.

```
​```sig
WRITER || COMPANY
Name | sig_writer_name || Entity | sig_company_entity
Signature [tall] || Signature [tall]
Date || Date
​```
```

For a single-party block (sole signer, AI co-author whose attestation isn't parallel to a counterparty), omit the `||` — or leave the right side fully blank — and it renders 2-column at full width with one merged header.

```
​```sig
CLAUDE (AI Collaborator)
Name | sig_ai_name
Origin | sig_ai_origin
Signature [tall]
​```
```

**`grid` — schedule/inventory table.** YAML body with `columns` (each `{label, key, width}`) and either `rows` (array of objects) or `empty_rows: N` (blank rows for hand-fill). `key: '#'` auto-numbers. Widths are relative — scaled to page width.

```
​```grid
columns:
  - {label: '#', key: '#', width: 600}
  - {label: 'Composition title', key: 'title', width: 2700}
  - {label: 'Co-writers', key: 'cowriters', width: 2400}
  - {label: 'Share', key: 'share', width: 1500}
empty_rows: 10
​```
```

**`grids` — multiple grid tables sharing one column spec.** `from:` is a list of JSON file paths (relative to the `.md`) or inline objects. `rows:` is a dot-path into each loaded object pointing at the row array (omit to use the whole value). `heading:` is interpolated against each loaded object (`{album.title}`); set `heading: false` to omit.

```
​```grids
from:
  - data/trained_for_this.json
  - data/la_roue.json
heading: "{album.title} — UPC {album.upc}"
rows: tracks
columns:
  - {label: '#',     key: 'n',     width: 600}
  - {label: 'Title', key: 'title', width: 5000}
  - {label: 'ISRC',  key: 'isrc',  width: 2460}
​```
```

## House style — the defaults

- Times New Roman, 12pt body, 1.5 line spacing, justified.
- US Letter, 1" margins. Content width 9360 DXA.
- Centered uppercase H1, left-aligned bold H2 kept with next paragraph.
- Full grid borders (1pt black), 7pt cell padding, centered vertical alignment.
- Schedule headers shaded `#EEEEEE`.

If a project needs a different look, edit `lib/defaults.js`. Goal: 95% of documents use unmodified defaults for portfolio consistency.

## Workflow

1. Read the user's request: document type, parties, prefilled values.
2. `mkdir -p /home/claude/work && cd /home/claude/work`, copy an example, edit.
3. Run `node $SKILL_DIR <input.md>`.
4. Validate: `python3 /mnt/skills/public/docx/scripts/office/validate.py <output.docx>`.
5. Render to PDF + page image to visually check (use `soffice` and `pdftoppm` from the `docx` skill).
6. Copy the final `.docx` to `/mnt/user-data/outputs/` and `present_files` to the user, along with the source `.md` so they can re-run with new values.

## When you need more than markdown

For conditional logic or programmatically generated tables (e.g. populating a long Schedule A from a database), import the helpers directly:

```js
import { build, h2, p, fieldTable, signatureTable, gridTable }
  from '$SKILL_DIR/lib/index.js';
```

The exports in `lib/index.js` mirror the markdown blocks one-to-one. Read an example (`examples/songwriter-agreement.md`) and `lib/index.js` to translate.

## Worked examples

- `examples/songwriter-agreement.md` — full agreement.
- `examples/recording-assignment.md` — exercises every helper including `grid` for Schedule A.

## What this skill is NOT for

- Lawyer-grade bespoke drafting. Output is template-shaped; for deal-specific clauses or jurisdictional nuance, recommend attorney review.
- Plain prose (memos, reports — use `docx`), PDFs, spreadsheets, presentations.

## Caveats to surface to the user

- Template-grade, not legal advice. An attorney pass before signing is recommended for any deal of consequence.
- The `values` block is the only thing they need to edit for follow-on deals; signature lines stay blank for DocuSign to fill.
