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

### `term` vs `long` vs `values[key]`

Every `{{$the_X}}` introduce form renders **`<expansion> (the *"Term"*)`** —
two pieces drawn from different schema/values fields:

- **`term`** = the short label inside the parens (e.g. `"Agreement"`,
  `"Monthly Fee"`). Defaults to snake_case → Title Case.

- **`long`** = the prose expansion that appears *before* the parens. Use
  for **static** content baked into the template — full deal name, fixed
  percentages, dollar amounts, durations, anything that won't change
  between renders.

- **`values[key]`** = a runtime override of the expansion. Use for
  **dynamic** per-deal data — party names, addresses, effective dates,
  amounts that vary per contract. Wins over `long:`.

Example template `schema:`:

```yaml
schema:
  # Dynamic — values supply the expansion at render time
  agreement:      { long: "Agreement" }
  customer:       { long: "Customer" }
  contractor:     { long: "Contractor" }
  effective_date: { type: date, required: true }

  # Static — `long:` bakes the expansion into the template
  publishers_share: { term: "Publisher's Share", long: "a 50% share" }
  monthly_fee:      { term: "Monthly Fee",       long: "$1,850.00 per Location" }
  cure_period:      { term: "Cure Period",       long: "thirty (30) days" }
  insurance_floor:  { term: "Insurance Floor",   long: "$2,000,000 per occurrence" }
```

Companion values YAML (passed as `--values-file landscaping.yml`):

```yaml
# values.yml — only the dynamic fields need entries here.
effective_date: "June 1, 2026"
agreement:  "Landscaping Services Agreement"
customer:   "McDonald's USA, LLC"
contractor: "Greenline Landscaping, Inc."
```

`{{$the_Agreement}}` → `Landscaping Services Agreement (the ***"Agreement"***)`
(value beats `long:`); `{{$the_Monthly_fee}}` → `$1,850.00 per Location (the
***"Monthly Fee"***)` (no value, falls back to `long:`).

Now references like `{{$the_Publishers_share}}` always render `a 50% share (the
***"Publisher's Share"***)` regardless of values, and `{{$the_Monthly_fee}}`
always renders `$1,850.00 per Location (the ***"Monthly Fee"***)`.

After first introduction, use the plain reference form everywhere:
`{{the_Publishers_share}}` → "the Publisher's Share"; `{{the_Monthly_fee}}` →
"the Monthly Fee". Body reads natural English; one `long:` edit at the top
changes the dollar amount everywhere it's introduced.

#### Bake the article into `long:` when prose needs it

When the long expansion is itself a noun phrase that wants its own article ("an
initial term of two years"), bake the article into `long:` and use the **bare
`{{$key}}` introduce form** (no prefix) so the parenthetical emits no article
either:

```yaml
schema:
  initial_term: { term: "Initial Term", long: "an initial term of two (2) years" }
  renewal_term: { term: "Renewal Term", long: "a successive renewal term of one (1) year" }
```

```markdown
This Agreement shall continue for {{$Initial_term}} unless renewed for
{{$Renewal_term}}, after which the Initial Term and any Renewal Terms
together constitute the Term.
```

Renders:

> This Agreement shall continue for an initial term of two (2) years
> (***"Initial Term"***) unless renewed for a successive renewal term of
> one (1) year (***"Renewal Term"***), after which the Initial Term and
> any Renewal Terms together constitute the Term.

Don't double up — `{{$an_Initial_term}}` with `long: "an initial term…"` would
render `"an initial term of two (2) years (an Initial Term)"` — redundant
article.

### Worked pangram

Markers mirror the case of the rendered word so the markdown reads like the
legal document — `{{Writer}}` looks like "Writer" in the output, the article
prefix carries its own case (`the_` / `The_`):

> …governed by {{the_Agreement}}. {{The_Agreement}} shall remain in effect…

renders:

> …governed by the Agreement. The Agreement shall remain in effect…

Mid-sentence uses `{{the_Agreement}}` (lowercase article); sentence-start uses
`{{The_Agreement}}` (capital `T` in the marker → capital `T` in the output).

```markdown
This {{$the_Agreement}}, dated {{$the_Effective_date}}, is between
{{$the_Customer}} and {{$the_Contractor}}, individually {{$a_Party}} and
collectively {{$the_Parties}}. {{The_Contractor}} shall provide
{{!Services}} at each {{Location}} listed in **{{Schedule_A}}** for
{{$the_Monthly_fee}} per {{Location}}, subject to the {{Insurance}}
requirements set out below.
```

With schema (`agreement.long`, `customer.long`, `contractor.long`,
`monthly_fee.term`, `services`/`location`/`insurance`/`party` terms, plus values
for `effective_date`, `customer`, `contractor`, `monthly_fee`):

> This Landscaping Services Agreement (the ***"Agreement"***), dated
> June 1, 2026 (the ***"Effective Date"***), is between McDonald's USA, LLC
> (the ***"Customer"***) and Greenline Landscaping, Inc. (the ***"Contractor"***),
> individually a ***"Party"*** and collectively the ***"Parties"***. The
> Contractor shall provide ***"Services"*** at each Location listed in
> **Schedule A** for $1,850.00 (the ***"Monthly Fee"***) per Location,
> subject to the Insurance requirements set out below.

Forms hit:
- **Introduce + value substitution** (`{{$the_X}}` where `values.X` is set):
  `$the_agreement` → "Landscaping Services Agreement (the *Agreement*)";
  `$the_customer` → "McDonald's USA, LLC (the *Customer*)";
  `$the_monthly_fee` → "$1,850.00 (the *Monthly Fee*)".

- **Introduce + no expansion** (`{{$X}}` with no value/long → inline-styled):
  `$a_party` → "a *Party*"; `$the_parties` → "the *Parties*".

- **Plain references** (`{{X}}` / `{{the_X}}` — emit the styled term, no
  value lookup): `{{location}}` → "Location"; `{{the_contractor}}` →
  "the Contractor"; `{{The_contractor}}` (sentence start) → "The Contractor".

- **Literal inline-styled** (`{{!Term}}`): `{{!Services}}` → "*Services*"
  (defined-term introduction, heavy emphasis).

- **Schedule / exhibit references** — write `**{{Schedule_A}}**` (or any
  bare reference marker wrapped in markdown bold) to render plain bold
  *Schedule A* without the defined-term quote-and-italic styling. Schedule
  refs are section pointers, not terms of art — bold-only is the
  conventional treatment. The bare `{{Schedule_A}}` marker resolves
  through the same case-insensitive snake→Title-Case path as any other
  reference, so no schema entry is required.

### Worked Background paragraph — singular + plural collective intro

A common drafting idiom is "(each, a *Term*; collectively, the *Terms*)". Both
halves are introduced inline-styled forms with no expansion — singular via
`{{$a_X}}`, plural collective via `{{$the_Xs}}`. The plural is auto-derived from
the schema term, so you write the marker against the singular key:

```markdown
{{Customer}} owns and operates restaurant properties in the Chicago
metropolitan area and requires year-round grounds maintenance at the
properties listed in {{!Schedule A}} (each, {{$a_Location}}; collectively,
{{$the_Locations}}). {{Contractor}} is engaged in the business of commercial
landscaping and grounds maintenance and is willing to provide the
{{Services}} described in this {{Agreement}} at each {{Location}} on the
terms set out below.
```

With schema `customer`/`contractor`/`agreement`/`services`/`location` as plain
terms (no `long:`, no values needed):

> Customer owns and operates restaurant properties in the Chicago
> metropolitan area and requires year-round grounds maintenance at the
> properties listed in ***"Schedule A"*** (each, a ***"Location"***;
> collectively, the ***"Locations"***). Contractor is engaged in the
> business of commercial landscaping and grounds maintenance and is willing
> to provide the Services described in this Agreement at each Location on
> the terms set out below.

Forms hit:

- **Introduce-no-expansion, singular indefinite** (`{{$a_Location}}` →
  "a *Location*").

- **Introduce-no-expansion, plural definite** (`{{$the_Locations}}` →
  "the *Locations*"). Plural auto-derives from `location` schema term.

- **Plain references** for `Customer`, `Contractor`, `Agreement`,
  `Services`, `Location` — no styling, no parens.

- **Literal inline-styled** `{{!Schedule A}}` for the schedule reference.

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

This skill uses a **custom renderer** — not pandoc's default markdown→docx. For
tables, **always use the `grid` fenced block, not raw markdown tables**.
Markdown tables won't render in the output; the grid block is the only
supported tabular form (it produces the styled, full-grid-bordered look that
matches the rest of the document).

**`fields`** — bare snake_case keys (label resolves from schema
description/term, else snake→Title), or explicit `Label | key | prefix=$ |
sub=hint`. Don't combine bare key with opts — the first pipe forces
label-then-key parsing.

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

**`grid`** — styled table. YAML body with `columns:` (each `{label, key, width}`
— width is relative; the renderer scales to page width) plus one of:

- **`rows: [...]`** — single table; rows are objects keyed by column.
- **`rows: $key`** — single table; row array pulled from `values[key]`.
- **`empty_rows: N`** — single table with N blank rows (hand-fill at signing).
- **`from: [...]`** — repeater; emits one (optional heading + sub-table) per
  entry. Use this for Schedule A patterns where the same column shape repeats
  per location / album / album-side.
- **`from: $key`** — repeater; entry array pulled from `values[key]`.

`$key` resolves to `values[key]` and works the same in both `rows:` and
`from:`. Use `key: '#'` to auto-number a column.

Single table — rows literal in the template:

````
```grid
columns:
  - {label: '#',          key: '#',       width: 600}
  - {label: 'Service',    key: service,   width: 3500}
  - {label: 'Frequency',  key: frequency, width: 1800}
  - {label: 'Per-visit',  key: minimum,   width: 1500}
rows:
  - { service: "Mowing & Trimming", frequency: "Weekly",     minimum: "$120" }
  - { service: "Snow Removal",      frequency: "As-needed",  minimum: "$200" }
```
````

Single table — rows pulled from values:

````
```grid
columns:
  - {label: 'Make / Model', key: model,      width: 4000}
  - {label: 'Serial',       key: serial,     width: 2500}
  - {label: 'Daily Rate',   key: daily_rate, width: 1500}
rows: $units
```
````

```yaml
# values.yml
units:
  - { model: "Caterpillar 320", serial: "CAT320-001",  daily_rate: "$850/day" }
  - { model: "Genie S-65",      serial: "GEN-S65-002", daily_rate: "$340/day" }
```

Repeater (`from:`). Each entry is `{heading?, rows}`, supplied either inline
or as a YAML file path with the same shape — and you can **mix both** in the
same array. `from: $key` pulls the array from `values[key]` so callers can
supply the catalog at render time:

````
```grid
from: $locations
columns:
  - {label: '#',          key: '#',       width: 600}
  - {label: 'Service',    key: service,   width: 3500}
  - {label: 'Frequency',  key: frequency, width: 1800}
```
````

```yaml
# values.yml
locations:
  # External file — same shape as an inline entry.
  - examples/landscaping-lincoln-park.yml

  # Inline entry.
  - heading: "Roosevelt Rd — 5678 W Roosevelt Rd, Cicero"
    rows:
      - { service: "Mowing",       frequency: "Weekly" }
      - { service: "Snow Removal", frequency: "As-needed" }
```

```yaml
# examples/landscaping-lincoln-park.yml — same shape as an inline entry.
heading: "Lincoln Ave — 1234 N Lincoln Ave, Chicago"
rows:
  - { service: "Mowing", frequency: "Weekly" }
```

**Don't grep the bundled `dist/md-to-docx.js`** to understand block syntax —
the bundle is minified and won't help. The three blocks above (`fields`,
`sig`, `grid`) are the complete custom syntax; the shipped example exercises
all of them.

## Reference

The shipped example `examples/landscaping-agreement.md` (with sibling
`-sample.yml` and `landscaping-lincoln-park.yml` for the mixed-grid pattern) is
the deepest reference — read it when in doubt about layout, defined-term
placement, or grid blocks. Lists are double-spaced (blank line between items).

**Nested lists are not supported.** A `1. … a. … i. …` hierarchy will only
render the top level; the indented children get dropped. Use one of: 

- A flat lettered list with descriptive lead-ins ("(a) Mowing — weekly; (b) Snow
removal — as needed; …"). 

- Inline semicolon-separated clauses inside a single list item. 

- A `grid` block when the structure is genuinely tabular.

## Caveats to surface

- Template-grade, not legal advice.

- After rendering, copy the `.docx` to `/mnt/user-data/outputs/` and
  `present_files`.

## Installation

If the user asks how to install or distribute this skill, point them at the
[README](./README.md) — it covers Claude.ai upload, library install, and the
global CLI.
