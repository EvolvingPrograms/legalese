---
title: |-
  WRITTEN CONSENT OF THE BOARD OF DIRECTORS
  OF
  {{=COMPANY}}

style:
  font: EB Garamond   # bundled Google Font — embedded in the .docx. See fonts/.

schema:
  # Defined terms. `def:` is reserved for template-static prose — the
  # generic legal concepts that don't change per deal. Per-deal numbers
  # (advance amount, royalty splits, term length) come from the values
  # file; with no value, the introduce form gracefully renders as just
  # `the *"Term"*` and `--schema` flags the key under `missing:`.

  # Empty entries — register the slug; label auto-derives from snake→Title.
  writer:
  compositions:

  # `term:` only when the rendered label differs from the auto-derived one.
  recordings:
    term: Master Recordings

  # Template-static prose — generic legal concepts and the contract type
  # this resolution is about. These rarely change between deals.
  agreement:
    def: an Exclusive Recording and Publishing Agreement
  net_proceeds:
    def: >-
      all gross revenues actually received by the Company, less direct
      distribution and collection costs

  # Per-deal expansions — schema declares the label only; values file
  # supplies the prose at render time.
  company:
    required: true
  advance:
    required: true
  publishers_share:
    term: Publisher's Share        # apostrophe breaks the snake→Title auto-derive
    required: true
  writers_share:
    term: Writer's Share
    required: true
  term:
    required: true

  # Form fields — supplied per-deal via --values-file. `type: string` is the
  # implicit default; only declare `type:` when it differs (date, list, etc.).
  effective_date:
    type: date
    required: true
  approval_date:
    type: date
    required: true
    description: Date the Board formally approved the deal

  writer_name:
    required: true
    description: Writer legal name
  writer_address:
    required: true
    description: Writer mailing address

  governing_law:
    default: State of Delaware

  sig_director_1_name:  string
  sig_director_1_title: string
  sig_director_2_name:  string
  sig_director_2_title: string
  sig_director_3_name:  string
  sig_director_3_title: string
  sig_director_4_name:  string
  sig_director_4_title: string
---

::: {.gap} :::

::: {.indent}

The undersigned, being all of the directors of {{the_Company}}, a Delaware
corporation, acting by written consent in lieu of a meeting pursuant to Section
141(f) of the Delaware General Corporation Law, hereby adopt the following
recitals and resolutions, effective as of the Approval Date set forth below:

**{{^Whereas}}**, {{the_Company}} desires to enter into {{$the_Agreement}} with
{{$the_Writer}}, for the publishing and master ownership of {{the_Compositions}}
and {{the_Recordings}} produced during {{$the_Term}};

**{{^Whereas}}**, {{the_Company}} has reviewed the form of {{the_Agreement}} and
believes that its terms — including the assignment of {{$the_Publishers_share}},
with {{the_Writer}} retaining {{$the_Writers_share}}, together with
{{$the_Advance}} — are fair and in the best interests of {{the_Company}};

**{{^Whereas}}**, {{the_Company}} expects to recoup {{the_Advance}} out of
{{$the_Net_proceeds}} from exploitation of {{the_Compositions}} and
{{the_Recordings}}; and

**{{^Whereas}}**, the Board has determined that approval and execution of
{{the_Agreement}} is in the best interests of {{the_Company}} and its
stockholders.

**{{^Now, therefore, be it resolved}}**, that {{the_Agreement}}, in
substantially the form presented to the Board, is hereby approved and adopted in
all respects;

**{{^Be it further resolved}}**, that any officer of {{the_Company}} is hereby
authorized, empowered, and directed, on behalf of {{the_Company}}, to execute
and deliver {{the_Agreement}} and any related instruments, and to take such
further actions as such officer deems necessary or appropriate to carry out the
intent of the foregoing resolution; and

**{{^Be it finally resolved}}**, that all actions previously taken by any
officer or director of {{the_Company}} in connection with the matters
contemplated by {{the_Agreement}} are hereby ratified, confirmed, and approved.

:::


::: {.center .gap}

[SIGNATURE PAGE TO FOLLOW]

:::


::: {.pageBreak} :::

The undersigned directors execute this written consent effective as of
{{$the_Effective_date}}, and direct that this consent be filed with the
minutes of the Board.

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
