---
title: LANDSCAPING SERVICES AGREEMENT
indent: true   # legal block style — first-line indent on every body paragraph
style:
  font: EB Garamond   # bundled Google Font — embedded in the .docx, renders
                      # correctly even on systems without it installed.

schema:
  # Defined terms. Block form (one key per line) avoids flow-context quote
  # rules — values with commas / parens / apostrophes can be unquoted.

  # Empty entries — register the slug; label auto-derives from snake→Title.
  party:
  location:
  services:
  schedule_a:
  term:

  # Single-line definitions.
  agreement:
    def: Landscaping Services Agreement

  # `customer` / `contractor` need no `def:` — the auto-derived label
  # (snake → Title Case) already produces "Customer" / "Contractor". The
  # values file supplies the per-deal entity description (full legal
  # name + entity type + address) which becomes the introduce expansion.
  customer:
  contractor:

  # Per-deal expansions — supplied by the values file at render time, not
  # baked here. With no value, `{{$the_Monthly_fee}}` gracefully renders as
  # just `the *"Monthly Fee"*` (term reference only, no expansion prose);
  # `--schema` lists missing values under `missing:` so the user knows
  # what to fill in.
  initial_term:
    required: true
  renewal_term:
    required: true
  monthly_fee:
    required: true
  cure_period:
    required: true
  insurance_floor:
    required: true
  payment_date:
    required: true
  late_fee_rate:
    required: true

  # `term:` needed where the rendered label differs from the auto-derived one.
  non_renewal_notice:
    term: Non-Renewal Notice Period
    required: true
  insurance_notice:
    term: Insurance Notice Period
    required: true

  # Form fields. `type: string` is the implicit default; only declare `type:`
  # when it differs (date, list, etc.).
  effective_date:
    type: date
    required: true

  customer_name:
    required: true
  customer_entity:
    required: true
    description: Form of customer entity (e.g., a Delaware corporation)
  customer_address:
    required: true

  contractor_name:
    required: true
  contractor_entity:
    required: true
    description: Form of contractor entity (e.g., Illinois corporation)
  contractor_address:
    required: true

  governing_law:
    default: State of Illinois
  venue:
    default: Cook County, Illinois

  locations:
    type: list
    required: true
    description: Per-Location service spec (Schedule A)

  sig_customer_entity:
  sig_customer_by:
  sig_customer_title:
  sig_contractor_entity:
  sig_contractor_by:
  sig_contractor_title:
---

This {{$the_Agreement}} is entered into as of the Effective Date stated
below, by and between {{$the_Customer}} and {{$the_Contractor}}. Customer
and Contractor are referred to individually as {{$a_Party}} and
collectively as {{$the_Parties}}.

```fields
effective_date
customer_name
customer_entity
customer_address
contractor_name
contractor_entity
contractor_address
governing_law
venue
```

**Background.** {{Customer}} owns and operates restaurant properties in
the Chicago metropolitan area and requires year-round grounds maintenance
at the properties listed in **{{Schedule_A}}** (each, {{$a_Location}};
collectively, {{$the_Locations}}). {{Contractor}} is engaged in the
business of commercial landscaping and grounds maintenance and is willing
to provide the {{Services}} described below at each {{Location}} on the
terms set out below.

**Now, therefore**, in consideration of the mutual covenants set forth in
this {{Agreement}} and other good and valuable consideration, the receipt
and sufficiency of which are hereby acknowledged, {{the_Parties}} agree as
follows:

1. **Services.** The services to be performed by {{Contractor}} under this
   {{Agreement}} are the year-round grounds-maintenance services described
   in this Section (the {{!Services}}), detailed by frequency and
   per-visit minimum for each {{Location}} in {{Schedule_a}}, and
   consisting of:

   a. mowing and trimming, including turf mowing, edging along walks and
   curbs, and string-trimming around fixed obstacles;

   b. seasonal planting and mulching, including annual bed installation,
   seasonal color rotations, weeding, and mulch top-dressing;

   c. snow and ice removal, including plowing, shoveling of walks and
   entries, and application of de-icing materials during winter weather
   events; and

   d. trash policing, including routine pick-up and disposal of litter,
   debris, and food packaging from grounds, drive-thru lanes, and parking
   areas.

2. **Term.** This {{Agreement}} commences on the Effective Date and
   continues for {{$the_Initial_term}}. Thereafter, this {{Agreement}}
   automatically renews for {{$renewal_term}} (each, a {{Renewal_term}};
   {{the_Initial_term}} together with any {{Renewal_terms}}, {{$the_Term}}),
   unless either {{Party}} delivers written notice of non-renewal to the
   other {{Party}} no later than {{$the_Non_renewal_notice}} before the end
   of the then-current {{Term}}.

3. **Locations.** {{Contractor}} shall perform {{the_Services}} at each
   {{Location}} listed in {{Schedule_a}}, in a professional and workmanlike
   manner consistent with industry standards. {{Contractor}} shall furnish
   all labor, equipment, and materials required to perform {{the_Services}},
   except as otherwise specified in {{Schedule_a}}. {{The_Parties}} may
   add or remove a {{Location}} only by written amendment signed by both
   {{the_Parties}}, and removal of a {{Location}} reduces {{the_Monthly_fee}}
   on a pro-rata basis effective the first day of the calendar month
   following the amendment.

4. **Compensation.** In consideration of {{the_Services}}, {{Customer}}
   shall pay {{Contractor}} {{$the_Monthly_fee}}, payable on
   {{$the_Payment_date}} for {{the_Services}} rendered during that month.
   {{The_Monthly_fee}} is inclusive of all labor, equipment, materials,
   fuel, and disposal costs reasonably required to perform {{the_Services}}
   at the frequencies and minimums set out in {{Schedule_a}}. Late payments
   accrue interest at the lesser of {{$the_Late_fee_rate}} or the maximum
   rate permitted by law, computed from the Payment Date until paid in
   full.

5. **Insurance.** Throughout {{the_Term}}, {{Contractor}} shall maintain
   commercial general liability insurance with limits of not less than
   {{$the_Insurance_floor}} and shall name {{Customer}} as an additional
   insured. {{Contractor}} shall furnish {{Customer}} with a certificate
   of insurance evidencing such coverage on the Effective Date and on each
   policy renewal, and shall provide at least {{$the_Insurance_notice}}'
   prior written notice of any cancellation or material reduction in
   coverage. {{Contractor}} shall also maintain workers' compensation
   insurance as required by applicable law and commercial automobile
   liability insurance covering all vehicles used in the performance of
   {{the_Services}}.

6. **Independent Contractor.** {{Contractor}} is an independent contractor
   and not an employee, agent, joint venturer, or partner of {{Customer}}.
   Nothing in this {{Agreement}} creates an employment, agency,
   partnership, or joint-venture relationship between {{the_Parties}}.
   {{Contractor}} is solely responsible for the direction, supervision,
   and compensation of its personnel and for all applicable employment
   taxes, withholdings, and benefits.

7. **Representations and Warranties.** {{Contractor}} represents and
   warrants to {{Customer}} that:

   a. {{Contractor}} is duly organized, validly existing, and in good
   standing under the laws of its state of formation, and has the full
   right, power, and authority to enter into this {{Agreement}};

   b. {{Contractor}} holds all licenses, permits, and registrations
   required to perform {{the_Services}} at each {{Location}};

   c. {{the_Services}} will be performed in a professional and workmanlike
   manner, in compliance with applicable law, and consistent with industry
   standards; and

   d. {{Contractor}} will not knowingly use any materials or methods at a
   {{Location}} that violate applicable environmental, health, or safety
   law.

8. **Indemnification.** {{Contractor}} shall indemnify, defend, and hold
   harmless {{Customer}} and its officers, directors, employees, and
   agents from and against any third-party claim, loss, or liability,
   including reasonable attorneys' fees, arising out of:

   a. any negligent or willful act or omission of {{Contractor}} in
   performing {{the_Services}};

   b. any bodily injury or property damage caused by {{Contractor}} or
   its personnel at a {{Location}}; or

   c. any material breach by {{Contractor}} of its representations and
   warranties under this {{Agreement}}.

9. **Termination.** Either {{Party}} may terminate this {{Agreement}}
   for material breach by the other {{Party}} upon {{$the_Cure_period}}'
   prior written notice and opportunity to cure. If the breaching
   {{Party}} fails to cure within {{the_Cure_period}}, this {{Agreement}}
   terminates at the end of that period without further action. Upon
   termination or non-renewal, {{Contractor}} shall promptly cease
   performance of {{the_Services}}, and {{Customer}} shall pay
   {{Contractor}} the pro-rata portion of {{the_Monthly_fee}} earned
   through the effective date of termination.

10. **Governing Law and Venue.** This {{Agreement}} is governed by the
    law of the State identified as the Governing Law in Section 1,
    without regard to its conflict-of-laws principles. Venue for any
    dispute arising under this {{Agreement}} lies exclusively in the
    state or federal courts of the Venue identified in Section 1, and
    each {{Party}} consents to the jurisdiction of such courts.

11. **General Provisions.** This {{Agreement}}, together with
    {{Schedule_a}}, constitutes the entire agreement between
    {{the_Parties}} with respect to its subject matter and supersedes
    any prior understandings between {{the_Parties}} relating to the
    same. No amendment is effective unless in writing and signed by
    both {{the_Parties}}. If any provision is found unenforceable, the
    remainder of this {{Agreement}} remains in effect. This
    {{Agreement}} may be executed in counterparts, including by
    electronic signature, each of which is deemed an original.

::: {.center .gap}
[SIGNATURE PAGE TO FOLLOW]
:::

::: {.pageBreak}
{{The_Parties}} have executed this {{Agreement}} as of the Effective Date.
:::

```sig
CUSTOMER || CONTRACTOR
Entity | sig_customer_entity        || Entity     | sig_contractor_entity
By (name) | sig_customer_by         || By (name)  | sig_contractor_by
Title | sig_customer_title          || Title      | sig_contractor_title
Signature [tall]                    || Signature [tall]
Date                                || Date
```

## Schedule A — Per-Location Service Specification {.pageBreak}

For each {{Location}} below, the following table sets out the service
categories, frequency, and per-visit minimums applicable under this
{{Agreement}}.

```grid
# `from:` turns a single grid into a repeater: one (heading + sub-table) per
# entry. Each entry is `{heading?, rows}`, supplied either as a YAML file path
# (CWD-relative when pulled via $key) or inline. `$locations` is a values key.
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
  - label: 'Per-visit minimum'
    key: minimum
    width: 1800
```
