---
name: legal-doc-builder
description: "Use this skill to produce a signable, professional .docx legal or business document (agreement, assignment, license, NDA, addendum, contract, schedule) from a markdown template + values YAML, OR when the user asks for any contract / agreement / license / assignment / addendum / NDA / schedule / signable Word doc — even if they don't say 'docx', they almost always want a polished fillable file rather than markdown. Load when the user wants fields prefilled from a values block, shows an existing legal template and wants to extend or replicate its style, asks for a Schedule A or schedule grid, needs side-by-side or single-party signature blocks, or describes a contract using defined-term language ('the Agreement', 'the Parties', 'Publisher's Share'). Defer here instead of writing raw docx-js code by hand."
---

# Legal document builder

Markdown template + values YAML → signable `.docx` in house style.

## Run

```
node $SKILL_DIR <template.md> --values-file <values.yml> --output <out.docx>
```

`$SKILL_DIR` is the absolute path to this skill directory — substitute it
literally (e.g. `node /mnt/skills/user/legal-doc-builder doc.md`). Don't use
bash's `VAR=val command` inline-assignment syntax: `$SKILL_DIR` expands to the
parent shell's (empty) value before the assignment takes effect, and Node ends
up running the `.md` as a script. `pandoc` must be on `PATH` (it is here).

Inspect what a template needs without rendering:
`node $SKILL_DIR <template.md> --schema` — prints `values:`, `schema:`,
`required:`, `missing:` as YAML.

## Workflow

1. **Identify** the parties, deal type, and operative terms.
2. **Schema first** — declare every defined term (`term:`, optional `long:`,
   `plural:` for irregulars) and every form field (`type:`, `required:`,
   `description:`, `default:`).
3. **Body** — write natural prose with markers; let the schema drive labels.
4. **Values YAML** — fill in everything you know. For unknowns, ask the user
   one batched question. Re-run `--schema` to confirm `missing:` is empty.
5. **Render**, validate (`python3 /mnt/skills/public/docx/scripts/office/validate.py`),
   and `present_files` the `.docx` plus the values YAML.

## Marker syntax

The article rides in the marker prefix; the term comes from schema.

| Marker | Renders | Notes |
|---|---|---|
| `{{key}}` | `Key` | plain, no article |
| `{{the_key}}` | `the Key` | definite |
| `{{The_key}}` | `The Key` | sentence-start cap |
| `{{a_key}}` | `a Key` / `an Key` | auto-picks by leading vowel sound |
| `{{An_key}}` | `An Key` / `A Key` | capitalized indefinite |
| `{{$key}}` | `<expansion> ***Key***` | introduce, inline-styled (no expansion → just styled) |
| `{{$the_key}}` | `<expansion> (the ***Key***)` | introduce + parenthetical define |
| `{{$a_key}}` | `<expansion> (a ***Key***)` | introduce, indefinite |
| `{{Term}}` | `(the ***Term***)` | literal define, parens (label not in schema) |
| `{{!Term}}` | `***Term***` | literal define, inline-styled (sentence-start) |

Lookup is case-insensitive (`{{Operator}}` resolves to `schema.operator`).
`a_` / `an_` auto-flips by the first letter of the resolved term — change
`recording.term: "Recording"` → `"Original Sound Recording"` and every
`{{a_recording}}` flips from "a Recording" to "an Original Sound Recording"
without touching the body. Plurals auto-derive (`recording` → `recordings`);
irregulars use `plural: "People"` in schema.

For values that fill the prose expansion (party names, dates), set them in
the values YAML at the *schema key*, not a side field. With
`schema.assignor: { long: "Assignor" }`, then `values.assignor: "Acme
Records LLC"` — `{{$the_assignor}}` renders
`Acme Records LLC (the "Assignor")`.

### One-paragraph pangram

```markdown
This {{$the_agreement}}, dated {{$the_effective_date}}, is between
{{$the_assignor}} and {{$the_assignee}}, individually {{$a_party}} and
collectively {{$the_parties}}. Each {{recording}} listed in {{!Schedule A}}
is assigned to {{the_assignee}}, subject to {{the_writers_share}} retained
by {{the_assignor}}.
```

Renders as (with schema declaring `agreement.long`, `assignor.long`,
`assignee.long`, `party`, `recording`, `writers_share`, plus values for
`effective_date`, `assignor`, `assignee`):

> This Copyright Assignment (the ***"Agreement"***), dated April 29, 2026
> (the ***"Effective Date"***), is between Acme Records LLC (the ***"Assignor"***)
> and Buyer Holdings Inc. (the ***"Assignee"***), individually a ***"Party"*** and
> collectively the ***"Parties"***. Each Recording listed in ***"Schedule A"*** is
> assigned to the Assignee, subject to the Writer's Share retained by the
> Assignor.

Forms hit: introduce-with-expansion (`$the_…`), introduce-no-expansion
(`$a_party`, `$the_parties` — inline styled), plain reference
(`{{recording}}`, no article; `{{the_assignee}}` / `{{the_writers_share}}`,
plain capitalized with article), literal inline-styled (`{{!Schedule A}}`).

## Schema entry fields

```yaml
schema:
  agreement:    { long: "Copyright Assignment" }
  party:        { term: "Party" }                 # plural auto-derives: Parties
  person:       { term: "Person", plural: "People" } # irregular plural
  effective_date:    { type: date,   required: true }
  writer_name:       { type: string, required: true, description: "Writer legal name" }
  governing_law:     { type: string, default: "State of Delaware" }
```

## Fenced blocks

**`fields`** — bare snake_case keys (label resolves from schema
description/term, else snake→Title), or explicit `Label | key | prefix=$ | sub=hint`.
Don't combine bare key with opts — the first pipe forces label-then-key parsing.

````
```fields
effective_date
writer_name
Licensing Fee | fee | prefix=$
Spotify URL | spotify | sub=if credit required
```
````

**`sig`** — first line is `LEFT_HEADER || RIGHT_HEADER`; each row is
`Label | key [tall]? || Label | key [tall]?`. Omit `||` for single-party.

````
```sig
WRITER || COMPANY
Name | sig_writer_name        || Entity     | sig_company_entity
Email | sig_writer_email      || By (name)  | sig_company_by
                              || Title      | sig_company_title
Signature [tall]              || Signature [tall]
Date                          || Date
```
````

**`grid`** / **`grids`** — YAML body. `grids: from: $albums` resolves the
catalog from a values key (paths in values are CWD-relative).

## Reference

The shipped example `examples/recording-publishing-agreement.md` (with sibling
`-sample.yml`) is the deepest reference — read it when in doubt about layout,
defined-term placement, or grid blocks. Lists are double-spaced (blank line
between items).

## Caveats to surface

- Template-grade, not legal advice — recommend an attorney pass.
- After rendering, copy the `.docx` to `/mnt/user-data/outputs/` and
  `present_files`.

## Installation

If the user asks how to install or distribute this skill, point them at the
[README](./README.md) — it covers Claude.ai upload, library install, and the
global CLI.
