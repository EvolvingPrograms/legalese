# Test prompt

Use this in a fresh Claude session (with the legal-doc-builder skill installed)
to exercise the full pipeline on a domain that does **not** match the shipped
landscaping example. A clean run produces a signable `.docx` with defined
terms, a Schedule A grid (one sub-table per rented unit), and a two-sided
signature block — no landscaping or music vocabulary.

---

> Draft a Construction Equipment Rental Agreement between **Midwest Builders
> & Co.** (Illinois general partnership, 4400 W Roosevelt Rd, Bellwood, IL
> 60104) as the lessee and **Atlas Heavy Rentals, LLC** (Delaware LLC, 18
> Industrial Loop, Joliet, IL 60436) as the lessor, effective May 15, 2026.
>
> Atlas will rent three pieces of equipment to Midwest for use at the lessee's
> active job site at **2200 S Halsted St, Chicago, IL 60608**:
>
> - one Caterpillar 320 hydraulic excavator
> - one Genie S-65 telescopic boom lift
> - one CAT XQ400 400 kW diesel generator
>
> Term: an initial rental period of ninety (90) days, renewable in 30-day
> increments by mutual written agreement. Either party may terminate for
> material breach on 14 days' written notice and opportunity to cure.
>
> Rates: each unit has its own daily rate and minimum billable period —
> the excavator at \$850/day (28-day minimum), the boom lift at \$340/day
> (14-day minimum), and the generator at \$420/day (7-day minimum). Atlas
> invoices monthly on the 1st; Midwest pays within fifteen (15) days.
> Atlas covers routine maintenance; Midwest is responsible for fuel,
> operator labor, and any damage beyond ordinary wear.
>
> Insurance: Midwest carries commercial general liability of at least
> \$3,000,000 per occurrence and names Atlas as additional insured.
>
> **Schedule A** is the per-unit equipment specification — for each unit,
> list the make/model, serial number, daily rate, minimum billable period,
> and delivery date. Make up reasonable serial numbers and stagger the
> delivery dates across the first week of the term.
>
> Governing law: Illinois. Venue: Cook County, Illinois.
>
> Atlas's COO **Devon Park** will sign for Atlas Heavy Rentals. Midwest's
> Managing Partner **Rebecca Liu** will sign for Midwest Builders.

---

**Things to watch for in the rendered output:**

- **Defined terms** — `{{$the_Agreement}}` should render as
  `Construction Equipment Rental Agreement (the “Agreement”)`;
  `{{$the_Lessee}}` and `{{$the_Lessor}}` introduce the parties with
  their full legal descriptions and addresses.
- **Static `long:` expansions** — fixed amounts and periods like the
  insurance floor and cure period live in `schema.X.long`, not in
  `values:`, so they bake into the template.
- **Sentence-start capitalization** — paragraph starts use `{{The_Lessee}}`,
  `{{The_Parties}}` (capital T in marker → capital T in output);
  mid-sentence references use `{{the_Lessee}}` (lowercase).
- **Schedule A grid** — one sub-table per unit, mixing the external-file
  pattern and inline objects (e.g., put the excavator spec in a separate
  `examples/atlas-excavator.yml`-style YAML and inline the other two).
- **Two-sided signature block** — Lessee on left, Lessor on right;
  Rebecca Liu and Devon Park in `sig_*_by` fields.

**Run (from project root, with `examples/` already created):**

```bash
node $SKILL_DIR equipment-rental-agreement.md \
  --values-file equipment-rental-values.yml \
  --output Equipment_Rental_Agreement.docx
```
