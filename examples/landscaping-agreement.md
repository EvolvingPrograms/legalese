---
title: LANDSCAPING SERVICES AGREEMENT

schema:
  # Defined terms.
  agreement:        { long: "Landscaping Services Agreement" }
  customer:         { long: "Customer" }
  contractor:       { long: "Contractor" }
  party:            { term: "Party" }
  location:         { term: "Location" }
  services:         { term: "Services" }
  schedule_a:       { term: "Schedule A" }

  # Static terms with baked expansions.
  initial_term:     { term: "Initial Term", long: "an initial term of two (2) years" }
  renewal_term:     { term: "Renewal Term", long: "successive renewal terms of one (1) year each" }
  term:             { term: "Term" }
  monthly_fee:      { term: "Monthly Fee",      long: "$1,850.00 per Location per month" }
  cure_period:      { term: "Cure Period",      long: "thirty (30) days" }
  non_renewal_notice: { term: "Non-Renewal Notice Period", long: "sixty (60) days" }
  insurance_floor:  { term: "Insurance Floor",  long: "$2,000,000 per occurrence" }
  payment_date:     { term: "Payment Date",     long: "the fifteenth (15th) day of each calendar month" }

  # Form fields.
  effective_date:     { type: date,   required: true }

  customer_name:      { type: string, required: true }
  customer_entity:    { type: string, required: true, description: "Customer entity form (e.g., Delaware limited liability company)" }
  customer_address:   { type: string, required: true }

  contractor_name:    { type: string, required: true }
  contractor_entity:  { type: string, required: true, description: "Contractor entity form (e.g., Illinois corporation)" }
  contractor_address: { type: string, required: true }

  governing_law:      { type: string, default: "State of Illinois" }
  venue:              { type: string, default: "Cook County, Illinois" }

  locations:          { type: list, required: true, description: "Per-Location service spec (Schedule A)" }

  sig_customer_entity:    string
  sig_customer_by:        string
  sig_customer_title:     string
  sig_contractor_entity:  string
  sig_contractor_by:      string
  sig_contractor_title:   string
---

This {{$the_Agreement}} is entered into as of the Effective Date stated below,
by and between {{$the_Customer}} and {{$the_Contractor}} identified in
Section 1. Customer and Contractor are referred to individually as
{{$a_Party}} and collectively as {{$the_Parties}}.

## 1. Parties and Effective Date

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

## 2. Background

{{Customer}} owns and operates restaurant properties in the Chicago
metropolitan area and requires year-round grounds maintenance at the
properties listed in {{!Schedule A}} (each, {{$a_Location}}; collectively,
{{$the_Locations}}). {{Contractor}} is engaged in the business of commercial
landscaping and grounds maintenance and is willing to provide the
{{Services}} described in this {{Agreement}} at each {{Location}} on the
terms set out below.

## 3. Term

This {{Agreement}} shall commence on the Effective Date and continue for
{{$the_Initial_term}}. Thereafter, this {{Agreement}} shall automatically
renew for {{$renewal_term}} (each, a {{Renewal_term}}; {{the_Initial_term}}
together with any {{Renewal_terms}}, {{$the_Term}}), unless either {{Party}}
delivers written notice of non-renewal to the other {{Party}} no later than
{{$the_Non_renewal_notice}} before the end of the then-current {{Term}}.

## 4. Services

{{!Services}} means the year-round grounds maintenance services described
in this Section 4 and detailed by frequency and per-visit minimum for each
{{Location}} in {{Schedule_a}}, including:

a. **Mowing & Trimming** — turf mowing, edging along walks and curbs, and
string-trimming around fixed obstacles;

b. **Seasonal Planting & Mulching** — annual bed installation, seasonal
color rotations, weeding, and mulch top-dressing;

c. **Snow & Ice Removal** — plowing, shoveling of walks and entries, and
application of de-icing materials during winter weather events; and

d. **Trash Policing** — routine pick-up and disposal of litter, debris,
and food packaging from grounds, drive-thru lanes, and parking areas.

{{Contractor}} shall perform {{the_Services}} at each {{Location}} in a
professional and workmanlike manner consistent with industry standards
and shall furnish all labor, equipment, and materials required to do so,
unless otherwise specified in {{Schedule_a}}.

## 5. Locations

{{The_Services}} shall be performed at each of {{the_Locations}} listed in
{{Schedule_a}}. {{The_Parties}} may add or remove a {{Location}} only by
written amendment signed by both {{the_Parties}}. Removal of a {{Location}}
shall reduce the {{Monthly_fee}} on a pro-rata basis effective the first
day of the calendar month following the amendment.

## 6. Compensation

{{Customer}} shall pay {{Contractor}} {{$the_Monthly_fee}}, payable on
{{$the_Payment_date}} for {{the_Services}} rendered during that month.
{{The_Monthly_fee}} is inclusive of all labor, equipment, materials, fuel,
and disposal costs reasonably required to perform {{the_Services}} at the
frequencies and minimums set out in {{Schedule_a}}. Work outside the scope
of {{the_Services}} (including storm cleanup beyond ordinary snow events,
tree removal, and irrigation repair) shall be invoiced separately and only
upon prior written authorization from {{Customer}}.

Late payments shall accrue interest at the lesser of one and one-half
percent (1.5%) per month or the maximum rate permitted by law, computed
from the Payment Date until paid in full.

## 7. Insurance

Throughout {{the_Term}}, {{Contractor}} shall maintain commercial general
liability insurance with limits of not less than {{$the_Insurance_floor}},
and shall name {{Customer}} as an additional insured on such policy.
{{Contractor}} shall furnish {{Customer}} with a certificate of insurance
evidencing such coverage on the Effective Date and on each policy renewal,
and shall provide at least thirty (30) days' prior written notice of any
cancellation or material reduction in coverage.

{{Contractor}} shall also maintain workers' compensation insurance as
required by applicable law and commercial automobile liability insurance
covering all vehicles used in the performance of {{the_Services}}.

## 8. Independent Contractor

{{Contractor}} is an independent contractor and not an employee, agent,
joint venturer, or partner of {{Customer}}. Nothing in this {{Agreement}}
creates an employment, agency, partnership, or joint-venture relationship
between {{the_Parties}}. {{Contractor}} is solely responsible for the
direction, supervision, and compensation of its personnel and for all
applicable employment taxes, withholdings, and benefits.

## 9. Representations and Warranties

{{Contractor}} represents and warrants to {{Customer}} that:

a. {{Contractor}} is duly organized, validly existing, and in good
standing under the laws of its state of formation, and has the full right,
power, and authority to enter into this {{Agreement}};

b. {{Contractor}} holds all licenses, permits, and registrations required
to perform {{the_Services}} at each {{Location}};

c. {{The_Services}} will be performed in a professional and workmanlike
manner, in compliance with applicable law, and consistent with industry
standards; and

d. {{Contractor}} shall not knowingly use any materials or methods at a
{{Location}} that violate applicable environmental, health, or safety law.

## 10. Indemnification

{{Contractor}} shall indemnify, defend, and hold harmless {{Customer}}
and its officers, directors, employees, and agents from and against any
third-party claim, loss, or liability (including reasonable attorneys'
fees) arising out of:

a. The negligent or willful acts or omissions of {{Contractor}} in
performing {{the_Services}};

b. Any bodily injury or property damage caused by {{Contractor}} or its
personnel at a {{Location}}; or

c. Any material breach by {{Contractor}} of its representations and
warranties under this {{Agreement}}.

{{Customer}} shall indemnify {{Contractor}} on the same terms with respect
to {{Customer}}'s material breach of this {{Agreement}}.

## 11. Termination

Either {{Party}} may terminate this {{Agreement}} for material breach by
the other {{Party}} upon {{$the_Cure_period}}' prior written notice and
opportunity to cure. If the breaching {{Party}} fails to cure within
{{the_Cure_period}}, this {{Agreement}} shall terminate at the end of
that period without further action.

Either {{Party}} may also decline renewal of the then-current {{Term}}
by giving written notice as set out in Section 3.

Upon termination or non-renewal, {{Contractor}} shall promptly cease
performance of {{the_Services}}, and {{Customer}} shall pay {{Contractor}}
the pro-rata portion of {{the_Monthly_fee}} earned through the effective
date of termination. Sections 6 (with respect to amounts then accrued),
7, 9, 10, 12, and 13 shall survive termination or non-renewal.

## 12. Governing Law and Venue

This {{Agreement}} is governed by the law of the State of Illinois,
without regard to its conflict-of-laws principles. Venue for any dispute
arising under this {{Agreement}} shall lie exclusively in the state or
federal courts located in Cook County, Illinois, and each {{Party}}
consents to the jurisdiction of such courts.

## 13. General Provisions

This {{Agreement}}, together with {{Schedule_a}}, constitutes the entire
agreement between {{the_Parties}} with respect to its subject matter and
supersedes any prior understandings between {{the_Parties}} relating to
the same. No amendment is effective unless in writing and signed by both
{{the_Parties}}. If any provision is found unenforceable, the remainder
of this {{Agreement}} shall remain in effect. This {{Agreement}} may be
executed in counterparts, including by electronic signature, each of
which is deemed an original.

## 14. Signatures {.pageBreak}

Agreed and accepted as of the Effective Date:

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

```grids
# `from:` accepts an array of YAML paths (relative to the CWD) and/or inline
# objects, OR a `$key` reference that resolves to an array in values — so
# callers can supply the catalog at render time without editing the template.
from: $locations
heading: "{location.name} — {location.address}"
rows: services
columns:
  - {label: '#',           key: '#',         width: 600}
  - {label: 'Service',     key: service,     width: 3500}
  - {label: 'Frequency',   key: frequency,   width: 1800}
  - {label: 'Per-visit minimum', key: minimum, width: 1800}
```
