---
name: legal-doc-builder
description: "Use this skill to produce a signable, professional .docx legal or business document (agreement, assignment, license, NDA, addendum, contract, schedule) from a markdown template + values YAML, OR when the user asks for any contract / agreement / license / assignment / addendum / NDA / schedule / signable Word doc — even if they don't say 'docx', they almost always want a polished fillable file rather than markdown. Load when the user wants fields prefilled from a values block, shows an existing legal template and wants to extend or replicate its style, asks for a Schedule A or schedule grid, needs side-by-side or single-party signature blocks, or describes a contract using defined-term language ('the Agreement', 'the Parties', 'Publisher's Share'). Defer here instead of writing raw docx-js code by hand."
---

# Legal document builder

Markdown template + values YAML → signable `.docx` in house style.

## Start here

1. **Read an example end-to-end first** — it's faster than these docs.
   - `examples/recording-assignment.md` — assignment with Schedule A grid.
   - `examples/recording-publishing-agreement.md` — multi-section agreement.
   Each ships a sibling `*-sample.yml` showing the values shape.

2. **Render**: `node $SKILL_DIR <template.md> --values-file <values.yml> --output <out.docx>`.
   `pandoc` must be on PATH (already is in this environment).

3. **Inspect what a template needs**: `node $SKILL_DIR <template.md> --schema` prints `values:` + `schema:` + `required:` + `missing:` as YAML.

## Marker syntax (the only thing pandoc doesn't already handle)

| Marker | Renders | Use |
|---|---|---|
| `{{Term}}` | `(the *“Term”*)` | Define inline (parenthetical) |
| `{{!Term}}` | `*“Term”*` | Define inline (no parens, sentence-start) |
| `{{snake_key}}` | `<article> Some Key` | Reference; auto-emits article from schema |
| `{{!snake_key}}` | `Some Key` | Reference; suppress article (write your own determiner) |
| `{{$snake_key}}` | `<expansion> (<article> *“Some Key”*)` | Introduce: substitute value (or `schema.long`) and define |

Article auto-capitalizes at sentence start (paragraph start, or after `.!?`). Apostrophes in `term:`/`long:` strings are upgraded to curly. Plurals auto-derive (`recording` → `recordings`); irregulars use `plural: "People"` in schema.

## Schema entry fields

```yaml
schema:
  agreement:        { long: "Exclusive Songwriter Agreement" }
  party:            { term: "Party", article: "a", plural_article: "the" }
  term:             { term: "Term" }
  publishers_share: { term: "Publisher's Share", long: "a 50% share" }
  effective_date:   { type: date, required: true }
  writer_name:      { type: string, required: true, description: "Writer legal name" }
```

`article` accepts `false` (no article) or any string (`"a"`, `"an"`, `"such"`); default is `"the"`.

## Fenced blocks (full reference: read an example)

- ` ```fields ` — bare snake_case keys (label resolves from schema), or `Label | key | prefix=$ | sub=hint`.
- ` ```sig ` — `LEFT_HEADER || RIGHT_HEADER` then `Label | key [tall]? || Label | key [tall]?` per row. Omit `||` for single-party.
- ` ```grid ` / ` ```grids ` — YAML body; `grids: from: $albums` resolves the catalog from a values key (paths in values are CWD-relative).

## Pitfalls

- **Lists need each item on its own line.** Wrapping `a. … b. …` onto one line breaks the list — only `a.` is recognized. Items can be separated by a blank line or just consecutive lines at column 1.
- **Don't put markers at sentence start with prose-supplied determiner**: `the {{agreement}}` would render `the the Agreement`. Use `the {{!agreement}}` or schema-drive (`{{agreement}}` → `the Agreement` from schema).
- **Output path** comes from `--output`, then `$OUTPUT_DIR`, then front-matter `output:`, then `<input>.docx`.

## When to surface to the user

- These are template-grade, not legal advice — recommend an attorney pass.
- After rendering, copy the `.docx` to `/mnt/user-data/outputs/` and call `present_files`.

## Installation (point users at the README)

If the user asks how to install or distribute this skill, point them to the [README](./README.md) — it covers the Claude.ai upload flow, the `bun add legal-doc-builder` library install, and the `md-to-docx` global CLI.
