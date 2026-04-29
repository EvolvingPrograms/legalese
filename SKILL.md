---
name: legal-doc-builder
description: "Build signable, professional .docx legal/business documents (agreements, assignments, licenses, addenda, NDAs, simple contracts) using either a compact JavaScript helper module or markdown with custom fenced blocks. Sensible defaults are baked in (Times New Roman, US Letter, full-grid field tables, side-by-side signature blocks, schedule grids). Use this skill whenever the user asks for a contract, agreement, license, assignment, addendum, NDA, schedule, or any signable Word document, even if they don't say 'docx' — they almost always want a polished, fillable file rather than markdown. Especially relevant when they want fields prefilled from a values block, when they show an existing template script and want to extend or replicate its style, when they want to write the body in markdown, or when the document needs grid tables, merged-cell signature blocks, or a Schedule A. Defer to this skill instead of writing raw docx-js code by hand."
---

# Legal document builder

A compact API for producing signable .docx contracts in a consistent house style. Helpers wrap the docx-js library so a typical agreement is mostly content, not boilerplate.

Two authoring paths share the same helpers and produce identical output. Pick whichever is more natural for the document at hand:

- **Markdown** (`scripts/md-to-docx.js`, pandoc-backed) — prose-heavy documents (most agreements). The body reads as plain text; only field tables, signature blocks, and grids use custom fenced blocks. Front-matter holds the title, output path, and `values` map. Pandoc handles smart quotes, em dashes, and lettered lists (`a. b. c.`) natively.
- **JavaScript** (`lib/index.js`, which re-exports from `lib/runs.js`, `lib/blocks.js`, `lib/{field,signature,grid}-table.js`, `lib/build.js`) — when you need precise control, conditional sections, or programmatic generation (e.g. populating a long Schedule A from data).

## When to reach for this

Use it for any signable Word document: agreements, assignments, licenses, NDAs, addenda, work-for-hire releases, sample clearances, schedules. Skip it for plain prose documents (use the `docx` skill directly), spreadsheets (`xlsx`), or PDFs (`pdf`).

## Setup

The skill is self-contained — `lib/` and `scripts/` are invoked in place. Only the source `.md` (or hand-written `.js`) lives in the work dir:

```bash
mkdir -p /home/claude/work && cd /home/claude/work
cp $SKILL_DIR/examples/songwriter-agreement.md ./my-agreement.md   # template to edit
```

`$SKILL_DIR` is wherever this skill is mounted (typically `/mnt/skills/...`). Substitute the real path; don't keep the literal `$SKILL_DIR`. The library is ESM (`"type": "module"` in the skill's `package.json`), so all imports use explicit `.js` extensions.

The `docx` and `js-yaml` packages are installed globally in this environment as `/home/claude/.npm-global/lib/node_modules`. The markdown path also requires `pandoc` (already at `/usr/bin/pandoc`). Set `NODE_PATH` at run time:

```bash
NODE_PATH=/home/claude/.npm-global/lib/node_modules node ...
```

After a successful build, validate:

```bash
python3 /mnt/skills/public/docx/scripts/office/validate.py output.docx
```

Then render to PDF and an image to visually check the layout looks right.

---

## Path A — Markdown source

This is the path most documents should use. The body is plain markdown; fenced blocks (` ```fields `, ` ```sig `, ` ```grid `) handle the structured pieces.

### Document shape

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
all work. Smart quotes and apostrophes are auto-applied to text content.

## 5. Grant of Rights

Writer hereby irrevocably assigns... the **Publisher's Share** (50%):

a. the entire publisher's share...
b. the right to register, license...
c. the right to register Company...

## 14. Signatures {.pageBreak}

Agreed and accepted as of the Effective Date:

​```sig
WRITER || COMPANY
Name | sig_writer_name        || Entity     | sig_company_entity
Email | sig_writer_email      || By (name)  | sig_company_by
                              || Title      | sig_company_title
Signature [tall]              || Signature [tall]
Date                          || Date
​```
```

### Run it

```bash
NODE_PATH=/home/claude/.npm-global/lib/node_modules \
  node $SKILL_DIR/scripts/md-to-docx.js songwriter-agreement.md
```

The output path comes from the front-matter `output:` field.

### Markdown features

| Source | Effect |
|--------|--------|
| `# Title` | Centered Heading 1 |
| `## Section` | Section heading (Heading 2) |
| `## Section {.pageBreak}` | Section heading starting a new page (pandoc attribute syntax) |
| `**bold**` | Bold |
| `*italic*` | Italic |
| `***bold italic***` | Both |
| `{{Term}}` | Defined term — renders as `(the *"Term"*)` |
| `1. 2. 3.` or `a. b. c.` | Lettered sublist `(a) (b) (c)`. Pandoc's `+fancy_lists` recognizes both styles natively. |
| `"text"`, `'text'`, `Writer's` | Smart quotes/apostrophes — auto-applied via pandoc's `+smart`. |
| `--` and `---` | En dash (`–`) and em dash (`—`) — auto. |
| Plain paragraph | `p()` with default 1.5-line justified spacing |
| `---` (hr) | Vertical spacer |

### Fenced blocks

**`fields` — field/values table.** One row per line, pipe-separated. Optional third column for `prefix=...` or `sub=...`:

```
​```fields
Effective Date | effective_date
Licensing Fee | fee | prefix=$ 
Spotify URL | spotify | sub=if credit required
​```
```

**`sig` — signature block.** First line is the headers separated by `||`. Each subsequent line is `Label | key | [tall]?` per side. Use `[tall]` to make the row taller for handwritten signatures. An empty side is fine.

```
​```sig
WRITER || COMPANY
Name | sig_writer_name || Entity | sig_company_entity
Signature [tall] || Signature [tall]
Date || Date
​```
```

**`grid` — schedule/inventory table.** YAML body with `columns` (each `{label, key, width}`) and either `rows` (array of objects) or `empty_rows: N` (generates N blank rows for hand-fill). `key: '#'` auto-numbers a column. Widths are relative — they're scaled to fit page width.

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

A worked example lives in `examples/songwriter-agreement.md` — open it for reference patterns.

---

## Path B — JavaScript source

When you need conditional logic, programmatic table population, or any feature the markdown converter doesn't support, write a JS file that uses the helpers directly.

### Document shape

```js
import {
  build, h2, p, b, i, bi, dt, list, spacer,
  fieldTable, signatureTable, gridTable,
} from '$SKILL_DIR/lib/index.js';

const values = {
  effective_date: '',
  governing_law: 'State of Texas',
  // ...
};

build({
  title: 'EXCLUSIVE SONGWRITER AGREEMENT',
  output: '/home/claude/work/Songwriter_Agreement.docx',
  body: [
    p('This Agreement', dt('Agreement'),
      ' is entered into as of the Effective Date stated below.'),
    h2('1. Parties and Effective Date'),
    fieldTable(values, [
      ['Effective Date', 'effective_date'],
      ['Governing law',  'governing_law'],
    ]),
    spacer(),
    h2('14. Signatures', { pageBreak: true }),
    signatureTable(values, {
      left:  { header: 'WRITER',  rows: [['Name', 'sig_w'], ['Signature', null, { tall: true }], ['Date', null]] },
      right: { header: 'COMPANY', rows: [['Entity', 'sig_c'], ['Signature', null, { tall: true }], ['Date', null]] },
    }),
  ],
});
```

The markdown examples in `examples/` are the closest reference — translate them to JS calls when you need the JS path.

### API reference

**Run helpers** (return `TextRun`, use inside `p()`):

| Call | Output |
|------|--------|
| `t('plain')` | plain text |
| `b('bold')` | bold text |
| `i('italic')` | italic text |
| `bi('"Term"')` | bold italic |
| `dt('Agreement')` | `' (the *"Agreement"*)'` — leading space included for natural placement after a noun. Returns an array; `p()` flattens automatically. |

**Block helpers**:

| Call | Behavior |
|------|----------|
| `p(...children)` | Justified body paragraph, 12pt, 1.5 line spacing. Children: strings, run helpers, or arrays. |
| `h1(text, { pageBreak })` | Centered title. |
| `h2(text, { pageBreak })` | Section heading, kept with next paragraph. |
| `list(...items)` | Lettered sublist `(a) (b) (c)`. Each item is a string or array of children. |
| `spacer()` | Blank line. |
| `raw(node)` | Pass through any docx-js Paragraph or Table — escape hatch. |

**Table helpers**:

- **`fieldTable(values, rows)`** — rows are `['Label', 'key']` shorthand or `['Label', 'key', { prefix, subLabel }]` or object form `{ label, key, prefix, subLabel }`.
- **`signatureTable(values, { left, right })`** — each side is `{ header, rows: [['Label', 'key', { tall: true }?]] }`. Pass `null` key to leave the value blank. Two sides auto-pad to equal length.
- **`gridTable({ columns, rows })`** — `columns: [{ label, key, width }]`, `rows: [{ key1: val, key2: val }]`. `key: '#'` auto-numbers.

**`build({ title, output, body })`** — `body` is a flat or nested array of paragraphs/tables. Returns a Promise of the output path.

---

## House style — the defaults

- Times New Roman, 12pt body, 1.5 line spacing, justified text.
- US Letter, 1" margins. Content width 9360 DXA (6.5 inches).
- Centered uppercase H1 titles, left-aligned bold H2 sections kept with next paragraph.
- All tables use full grid borders (1pt black) with 7pt cell padding and centered vertical alignment.
- Schedule headers shaded #EEEEEE.
- Signature rows can be tagged tall to leave room for handwritten signatures.

If a project genuinely needs a different look, edit `lib/defaults.js` (or import `defaults` from `lib/index.js` for read-only inspection) — but the goal is for 95% of documents to use the unmodified defaults so the style is consistent across a portfolio.

## Workflow for a new document

1. Read the user's request: document type, parties, prefilled values they've given.
2. **Decide markdown or JS** — markdown for prose-heavy documents, JS when you need conditional logic or generated content.
3. `mkdir -p /home/claude/work && cd /home/claude/work` and create the source file there.
4. Write the source file (`.md` or `.js`). Keep `values` and the body the only project-specific blocks.
5. Run it: `NODE_PATH=/home/claude/.npm-global/lib/node_modules node $SKILL_DIR/scripts/md-to-docx.js <input.md>` (markdown path) or `... node <your-build.js>` (JS path — import from `$SKILL_DIR/lib/index.js`).
6. Validate: `python3 /mnt/skills/public/docx/scripts/office/validate.py <output.docx>`.
7. Render to PDF and a page image to visually check (use `soffice.py` and `pdftoppm` from the `docx` skill).
8. Copy the final `.docx` to `/mnt/user-data/outputs/` and `present_files` to the user, along with the source file (`.md` or `.js`) so they can edit `values` and re-run.

## Worked examples

- `examples/songwriter-agreement.md` — full agreement in markdown.
- `examples/copyright-assignment.md` — exercises every helper including `grid` for Schedule A.

## What this skill is NOT for

- Lawyer-grade custom drafting. Output is template-shaped: clear, professional, signable. For deal-specific bespoke clauses or jurisdictional nuance, point the user toward an attorney review.
- Plain prose documents (memos, reports). Use the `docx` skill directly.
- PDFs (`pdf`), spreadsheets (`xlsx`), presentations (`pptx`).

## Caveats to surface to the user

When delivering a generated agreement:
- These are template-grade, not legal advice.
- An attorney pass before signing is recommended for any deal of consequence.
- The `values` block is the only thing they need to edit for follow-on deals; signature lines and signature dates intentionally stay blank for DocuSign to fill at signing.
