# Test prompt

Use this in a fresh Claude session (with the legal-doc-builder skill installed)
to exercise the full pipeline on a domain different from the music-industry
seed example. A clean run produces a signable `.docx` with defined terms,
a Schedule A grid, and a two-sided signature block — no music vocabulary.

---

> Draft a Landscaping Services Agreement between **McDonald's USA, LLC**
> (Delaware LLC, 110 N Carpenter St, Chicago, IL 60607) as the customer
> and **Greenline Landscaping, Inc.** (Illinois corporation, 4421 W
> Industrial Park Rd, Naperville, IL 60563) as the contractor, effective
> June 1, 2026.
>
> The contractor will provide year-round grounds maintenance at three
> McDonald's restaurant locations in the Chicago metro:
>
> - 1234 N Lincoln Ave, Chicago, IL 60614
> - 5678 W Roosevelt Rd, Cicero, IL 60804
> - 9012 S Cicero Ave, Oak Lawn, IL 60453
>
> Term: 2 years with auto-renewal in 1-year increments unless either party
> gives 60 days' written notice of non-renewal. Either party may terminate
> for material breach on 30 days' written notice and opportunity to cure.
>
> Compensation: a flat monthly fee of \$1,850 per location, payable on the
> 15th of each month, covering mowing, trimming, seasonal planting, mulching,
> snow and ice removal, and trash policing. The contractor carries general
> liability insurance of at least \$2,000,000 per occurrence.
>
> Schedule A is the per-location service spec — for each location, list the
> service categories (Mowing & Trimming / Seasonal Planting / Snow & Ice
> Removal / Trash Policing) with the service frequency (weekly / monthly /
> as-needed) and any per-visit minimums. Make up reasonable details.
>
> Governing law: Illinois. Venue: Cook County, Illinois.
>
> The contractor's CEO Sarah Chen will sign for Greenline. McDonald's USA's
> Director of Facilities Michael Torres will sign for McDonald's.

---

**Things to watch for in the rendered output:**

- **Defined terms** — `{{$the_agreement}}` should render as
  `Landscaping Services Agreement (the *“Agreement”*)`; `{{$the_customer}}`
  and `{{$the_contractor}}` introduce the parties with their full legal
  descriptions.
- **Indefinite articles** — `{{$a_location}}` (singular intro) and
  `{{the_locations}}` (plural ref) should both work via bidirectional
  schema lookup. If a location term were renamed to something starting with
  a vowel, the article should auto-flip.
- **Sentence-start capitalization** — at paragraph starts, the marker
  should be capitalized (`{{The_parties}}`, `{{The_customer}}`).
- **Schedule A grid** — three location entries, each rendering as its own
  grid heading + service-spec table.
- **Two-sided signature block** — McDonald's on left, Greenline on right;
  Sarah Chen and Michael Torres in `sig_*_by` fields.

**Run:**

```bash
node $SKILL_DIR landscaping-services-agreement.md \
  --values-file landscaping-values.yml \
  --output Landscaping_Services_Agreement.docx
```
