---
name: legalese
description: "Use this skill to produce a signable, professional .docx legal or business document (agreement, assignment, license, NDA, addendum, contract, schedule) from a markdown template + values YAML, OR when the user asks for any contract / agreement / license / assignment / addendum / NDA / schedule / signable Word doc — even if they don't say 'docx', they almost always want a polished fillable file rather than markdown. Load when the user wants fields prefilled from a values block, shows an existing legal template and wants to extend or replicate its style, asks for a Schedule A or schedule grid, needs side-by-side or single-party signature blocks, or describes a contract using defined-term language ('the Agreement', 'the Parties', 'Publisher's Share'). Defer here instead of writing raw docx-js code by hand."
---

# legalese

Markdown template + values YAML → signable `.docx` in house style.

## Run

```
node $SKILL_DIR <template.md> --values-file <values.yml> --output <out.docx>
```

`$SKILL_DIR` is the absolute path to this skill directory — substitute it
literally (e.g. `node /mnt/skills/user/legalese doc.md`). Don't use
bash's `VAR=val command` inline-assignment syntax: `$SKILL_DIR` expands to the
parent shell's (empty) value before the assignment takes effect, and Node ends
up running the `.md` as a script. `pandoc` must be on `PATH` (it is here).

Inspect what a template needs without rendering:
`node $SKILL_DIR <template.md> --schema` — prints `values:`, `schema:`,
`required:`, `missing:` as YAML.

## Workflow

1. **Identify** the parties, deal type, and operative terms.

2. **Schema first** — declare every defined term (`term:`, optional `def:`,
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
| `{{^TEXT}}` | small-caps run | "WHEREAS", "RESOLVED", "WITNESSETH" — formal recital/resolution keywords. Wrap in `**…**` for bold + small caps. |
| `[text]{.underline}` | underlined run | Markdown has no native underline; pandoc's bracketed-span extension provides it. Use for exhibit / schedule headings: `[EXHIBIT A]{.underline}`. Combinable with `**bold**` and `*italic*`. |
| `{{=key}}` | `<value>` | bare value substitution — no parens, no styling. Use for "BOARD RESOLUTIONS OF {{=COMPANY}}" → "BOARD RESOLUTIONS OF SAMPLE RECORDS, INC." `{{=Key}}` capitalizes first letter; `{{=KEY}}` uppercases. **No value supplied → renders the fill-in BLANK** (`__________`); no def/label fallback. Same in title and body. |
| `{{KEY}}` | uppercased label | Uppercases the *label* only ("Company" → "COMPANY"). For uppercased *value*, use `{{=KEY}}`. |

Lookup is case-insensitive (`{{Operator}}` resolves to `schema.operator`).
`a_` / `an_` auto-flips by the first letter of the resolved term — change
`recording.term: "Recording"` → `"Original Sound Recording"` and every
`{{a_recording}}` flips from "a Recording" to "an Original Sound Recording"
without touching the body. Plurals auto-derive (`recording` → `recordings`);
irregulars use `plural: "People"` in schema.

### `term` vs `def` vs `values[key]`

A schema entry can carry up to three orthogonal pieces of data, each
addressed by its own marker form:

| Source | Marker | Renders | Use for |
|---|---|---|---|
| **`term`** | `{{Term}}` / `{{the_Term}}` | `Term` / `the Term` | the short label inside the parens. Defaults to snake → Title. |
| **`def`** | (composed by `{{$the_X}}`) | the qualifier prose | the *static* descriptor — entity type, royalty split definition, anything that doesn't change per deal. |
| **`values[key]`** | `{{=Key}}` (raw) | the entity itself | the per-deal data — name, address, dollar amount, duration. |

**The introduce form `{{$the_X}}` composes value and def with a comma when
both are set** — that's the standard legal "[name], [qualifier] (the
*Label*)" pattern in one marker:

```yaml
schema:
  company:
    def: "a Delaware corporation"
values:
  company: "Evolving Programs, Inc."
```

```markdown
{{$the_Company}} hereby certifies.
```

renders:

> Evolving Programs, Inc., a Delaware corporation (the *"Company"*) hereby certifies.

If only one is set, the other is omitted from the comma-join — set just
`def:` for "a 50% share (the *"Publisher's Share"*)", set just `values:`
for "Acme Inc. (the *"Customer"*)".

**Mental test for what goes where:**
- "Does this string change between deals?" → `values`.
- "Is this descriptor part of the template's structure?" → `def`.
- "Is this just a short label?" → `term` (or rely on the auto-derive).

Bake `def:` only for truly static prose — contract type, jurisdiction
qualifier when the template targets one state, royalty-share definitions.
Per-deal numbers (fees, durations, dates) belong in `values:`.

**Graceful degradation when a value is missing:**

- Schema entry has `required: true` AND no value supplied → the
  introduce form renders a fill-in blank with the parenthetical define:
  `{{$the_Monthly_fee}}` → `__________ (the *"Monthly Fee"*)`. The blank
  makes the unfilled spot visually obvious in a draft, and the prose
  reads correctly once the blank is hand-filled or the doc re-rendered
  with values.

- Schema entry NOT marked required (and no value, no def) → the
  introduce form is treated as an intentional inline-styled definition:
  `{{$a_Party}}` → `a *"Party"*`, no parens. Use this for in-prose
  defined-term introductions like *"individually a *Party*"*.

`legalese my.md --schema` lists every required-but-missing key under
`missing:` so the user knows exactly what the values file needs.

Example template `schema:`:

```yaml
schema:
  # Template-static — the contract type doesn't change between deals,
  # so `def:` bakes it in.
  agreement:
    def: "Landscaping Services Agreement"

  # Empty entries — register the slug; label auto-derives from
  # snake → Title Case ("Customer" / "Contractor"). No `def:` needed
  # because those are exactly what the auto-derive produces. The values
  # file supplies the per-deal expansion (full party description).
  customer:
  contractor:

  # Form fields supplied per deal.
  effective_date:
    type: date
    required: true

  # Per-deal expansions — schema declares only the label (and `required:`
  # so the dump catches a missing fill-in). The expansion comes from the
  # values file at render time.
  publishers_share:
    term: "Publisher's Share"
    required: true
  monthly_fee:
    term: "Monthly Fee"
    required: true
  cure_period:
    term: "Cure Period"
    required: true
  insurance_floor:
    term: "Insurance Floor"
    required: true
```

Companion values YAML (passed as `--values-file landscaping.yml`):

```yaml
# values.yml — supplies all per-deal expansions.
effective_date:    "June 1, 2026"
customer:          "McDonald's USA, LLC"
contractor:        "Greenline Landscaping, Inc."
monthly_fee:       "$1,850.00 per Location"
publishers_share:  "a 50% share"
cure_period:       "thirty (30) days"
insurance_floor:   "$2,000,000 per occurrence"
```

`{{$the_Agreement}}` → `Landscaping Services Agreement (the ***"Agreement"***)`
(only `def:` set, no value). `{{$the_Customer}}` → `McDonald's USA, LLC (the
***"Customer"***)` (only value set, no `def:` — auto-derived label). If you
want the standard "name, qualifier" pattern on one marker, set both:

```yaml
schema:
  company:
    def: "a Delaware corporation"
values:
  company: "Evolving Programs, Inc."
```

`{{$the_Company}}` → `Evolving Programs, Inc., a Delaware corporation (the
***"Company"***)`.

After first introduction, use the plain reference form everywhere:
`{{the_Publishers_share}}` → "the Publisher's Share"; `{{the_Monthly_fee}}` →
"the Monthly Fee". Body reads natural English; one values edit changes the
dollar amount everywhere it's introduced.

#### Bake the article into `def:` when prose needs it

When the long expansion is itself a noun phrase that wants its own article ("an
initial term of two years"), bake the article into `def:` and use the **bare
`{{$key}}` introduce form** (no prefix) so the parenthetical emits no article
either:

```yaml
schema:
  initial_term:
    term: "Initial Term"
    def: "an initial term of two (2) years"
  renewal_term:
    term: "Renewal Term"
    def: "a successive renewal term of one (1) year"
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

Don't double up — `{{$an_Initial_term}}` with `def: "an initial term…"` would
render `"an initial term of two (2) years (an Initial Term)"` — redundant
article.

The same pattern handles **proper-noun terms** (names, parties like
Claude / a software product / a trade name) that take no article in
prose:

```yaml
schema:
  claude:
    def: "an artificial intelligence model created by Anthropic"
```

```markdown
{{Human_writer}} has collaborated with {{$Claude}} on certain works.
{{Claude}} contributed lyrical authorship.
```

Renders:

> Human Writer has collaborated with an artificial intelligence model
> created by Anthropic (***"Claude"***) on certain works. Claude
> contributed lyrical authorship.

First mention introduces with `{{$Claude}}` — bare `$` form, no `the_`
prefix, so the parenthetical is `("Claude")` not `(the "Claude")`.
Subsequent references use plain `{{Claude}}` and render as just "Claude".

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

With schema (`agreement.def`, `customer.def`, `contractor.def`,
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
properties listed in **{{Schedule_A}}** (each, {{$a_Location}}; collectively,
{{$the_Locations}}). {{Contractor}} is engaged in the business of commercial
landscaping and grounds maintenance and is willing to provide the
{{Services}} described in this {{Agreement}} at each {{Location}} on the
terms set out below.
```

With schema `customer`/`contractor`/`agreement`/`services`/`location` as plain
terms (no `def:`, no values needed):

> Customer owns and operates restaurant properties in the Chicago
> metropolitan area and requires year-round grounds maintenance at the
> properties listed in **Schedule A** (each, a ***"Location"***;
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

- **Schedule reference** `**{{Schedule_A}}**` — bare reference marker
  wrapped in markdown bold; renders **Schedule A** (bold, no quotes,
  no italic). The conventional treatment for schedule/exhibit pointers.

## Schema entry fields

```yaml
schema:
  agreement:
    def: "Copyright Assignment"
  party:
    term: "Party"                 # plural auto-derives: Parties
  person:
    term: "Person"
    plural: "People"              # irregular plural
  effective_date:
    type: date
    required: true
  writer_name:
    type: string
    required: true
    description: "Writer legal name"
  governing_law:
    type: string
    default: "State of Delaware"
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

For >2 signers (board resolutions, joint ventures), pair them via the same
two-sided syntax — one `sig` block per pair stacks 2x2 in the page:

````
```sig
DIRECTOR || DIRECTOR
Name | sig_director_1_name        || Name | sig_director_2_name
Title | sig_director_1_title      || Title | sig_director_2_title
Signature [tall]                  || Signature [tall]
Date                              || Date
```

```sig
DIRECTOR || DIRECTOR
Name | sig_director_3_name        || Name | sig_director_4_name
Title | sig_director_3_title      || Title | sig_director_4_title
Signature [tall]                  || Signature [tall]
Date                              || Date
```
````

A single-sided `from: $key` repeater also exists for cases where one stacked
column is preferred — see `examples/board-resolution.md` for both patterns.

Sig blocks are atomic — once they start they don't split across pages — and
emit a leading spacer paragraph for breathing room from the preceding prose.

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
  - label: '#'
    key: '#'
    width: 600
  - label: 'Service'
    key: service
    width: 3500
  - label: 'Frequency'
    key: frequency
    width: 1800
  - label: 'Per-visit'
    key: minimum
    width: 1500
rows:
  - service: "Mowing & Trimming"
    frequency: "Weekly"
    minimum: "$120"
  - service: "Snow Removal"
    frequency: "As-needed"
    minimum: "$200"
```
````

Single table — rows pulled from values:

````
```grid
columns:
  - label: 'Make / Model'
    key: model
    width: 4000
  - label: 'Serial'
    key: serial
    width: 2500
  - label: 'Daily Rate'
    key: daily_rate
    width: 1500
rows: $units
```
````

```yaml
# values.yml
units:
  - model: "Caterpillar 320"
    serial: "CAT320-001"
    daily_rate: "$850/day"
  - model: "Genie S-65"
    serial: "GEN-S65-002"
    daily_rate: "$340/day"
```

Repeater (`from:`). Each entry is `{heading?, rows}`, supplied either inline
or as a YAML file path with the same shape — and you can **mix both** in the
same array. `from: $key` pulls the array from `values[key]` so callers can
supply the catalog at render time:

````
```grid
from: $locations
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
      - service: "Mowing"
        frequency: "Weekly"
      - service: "Snow Removal"
        frequency: "As-needed"
```

```yaml
# examples/landscaping-lincoln-park.yml — same shape as an inline entry.
heading: "Lincoln Ave — 1234 N Lincoln Ave, Chicago"
rows:
  - service: "Mowing"
    frequency: "Weekly"
```

**Don't grep the bundled `dist/legalese.js`** to understand block syntax —
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

- A **flat lettered list** with descriptive lead-ins, double-spaced (blank
  line between items) so the renderer treats each as its own list item:

  ```markdown
  Upon termination, the following shall apply:

  a. Consultant shall promptly deliver all work-in-progress;

  b. Client shall pay for all accepted Deliverables and a pro-rata
  portion of any in-progress Deliverable; and

  c. Sections 5, 7, 8, 9, 10, and 11 shall survive.
  ```

- A `grid` block when the structure is genuinely tabular.

**Don't write inline lettered lists** like
`"…the following shall apply: (a) Consultant shall…; (b) Client shall…; and (c) Sections … shall survive."`
— they collapse the structure into a single paragraph with parenthetical
markers, lose the visual hierarchy lawyers expect, and read as run-on
prose. Always break clauses onto their own lines as a real lettered list
even when nesting isn't available.

## Bundled fonts

Five Google Fonts ship with the skill in the `fonts/` directory and embed
into the rendered `.docx` automatically when selected via `style.font:`.
The document opens with the correct font on systems where it isn't
installed — Word reads the embedded copy.

| Family | Style | Notes |
|---|---|---|
| **EB Garamond** | classic Garamond serif | Default legal serif; close analog to Adobe Garamond |
| **Source Serif 4** | modern, very readable | Adobe; tighter set width than Garamond |
| **Crimson Pro** | tight Garamond alternative | Compact, good for dense docs |
| **PT Serif** | workhorse legal serif | Standard, widely supported |
| **Libre Baskerville** | Baskerville substitute | Higher contrast than Garamond |

```yaml
---
title: ...
style:
  font: EB Garamond     # or any of the five bundled families above
  size: 12
---
```

When `style.font` matches a bundled family, the TTFs embed in the docx.
Otherwise (e.g. `font: Times New Roman`), the font is referenced by name
only — Word substitutes per the user's installation.

To add or refresh fonts: edit and run `bun scripts/fetch-fonts.ts` (downloads
from `github.com/google/fonts` raw URLs and updates `fonts/manifest.json`).

## Style overrides

Set in front-matter under `style:` to override house defaults. All fields
are optional. Sizes are in **twips** (1440 twips = 1") unless noted; font
sizes are in **points**.

```yaml
---
title: ...
indent: true                 # document-level: first-line indent on every body paragraph
style:
  font: Garamond             # body font family — Word substitutes if not installed
  size: 12                   # body font size in points (default 12)
  h1_size: 14                # Heading 1 size (default 14)
  h2_size: 12                # Heading 2 size (default 12)

  # Page margins. Single number → all four sides; object → per-side.
  margin: 1440               # 1" all around (default)
  # margin:
  #   top: 1440
  #   bottom: 1440
  #   left: 1800             # 1.25" left for binding
  #   right: 1440

  # Body paragraph spacing. Applies only to plain prose paragraphs —
  # cells and list items keep their own minimal spacing.
  spacing:
    before: 120              # twips before each paragraph (default 120)
    after: 120               # twips after (default 120)
    line: 360                # line height in 240ths (240=single, 360=1.5x, 480=2x)

  # Top-level numbered list (`1. **Title.** ...`).
  list:
    indent: 540              # marker→body distance, twips (default 540 ≈ 0.375")
    sub_indent: 900          # lettered sub-list body indent (default 900)
    sub_hanging: 360         # sub-list marker→body distance (default 360)
    bold_marker: true        # bold the top-level number (default true)

  # First-line indent applied by document-level `indent: true` and
  # `::: {.indent}` Divs. Default 540 — matches list body so paragraph
  # bodies and list bodies share the same left edge.
  body:
    indent: 540

  # Title (H1) alignment. Default 'center'.
  title:
    alignment: left          # or: center | right | justified

  # Multi-column page layout (academic-journal style). Title spans the
  # full page width; body content flows into N columns below.
  columns: 2                 # shorthand: 2 equal columns, 720-twip gap
  # Or full control:
  # columns:
  #   count: 2
  #   space: 720             # gap between columns (twips)
  #   separate: true         # vertical separator line
  #   equalWidth: true       # default true

  # Vertical breathing room emitted by `::: {.gap}` blocks. Default 240.
  gap: 240
---
```

When to override:
- **Different firm style?** Set `font` and `size`.
- **Block-style first-line indent throughout?** `indent: true` (already used by the landscaping example).
- **Wider binding margin?** `margin: { left: 1800 }`.
- **Double-spaced (e.g. court filings)?** `spacing: { line: 480 }`.
- **Plain numbering, no bold?** `style.list.bold_marker: false`.
- **Tighter list indents?** `style.list.indent: 360`.
- **Academic two-column paper?** `columns: 2`. Combine with `::: {.header}` (below) for author / affiliation / date in the spanning header.

## Div classes (block attributes)

`::: {.class} ... :::` blocks attach a class to a span of paragraphs.
Combinable space-separated: `::: {.center .pageBreak}`.

| Class | Effect |
|---|---|
| `.center` | center-aligns each contained paragraph |
| `.indent` | first-line-indents each paragraph (legal block style) |
| `.pageBreak` | starts a new page before this content |
| `.gap` | empty Div emits a tall blank paragraph (≈ 1 line); non-empty adds extra `before` spacing |
| `.title` | promotes contained paragraph(s) to Heading 1 — used to author multi-line title blocks (e.g., exhibit headers) since markdown ATX headings are single-line. Combine `\` (hard break) inside the paragraph for line breaks. |
| `.header` | extracts contents into the document's spanning header section (above any column split). Used for academic-paper layouts: title + `::: {.header}` for author / affiliation / date. |

Inline classes: `[text]{.underline}` underlines a span (markdown has no
native underline; pandoc's bracketed-span extension provides it).
Combine with bold/italic — `[**EXHIBIT A**]{.underline}` is bold +
underlined.

## Caveats to surface

- Template-grade, not legal advice.

- After rendering, copy the `.docx` to `/mnt/user-data/outputs/` and
  `present_files`.

## Installation

If the user asks how to install or distribute this skill, point them at the
[README](./README.md) — it covers Claude.ai upload, library install, and the
global CLI.
