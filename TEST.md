# Test prompt

Use this in a fresh Claude session (with the legalese skill installed)
to exercise the full pipeline on a domain that does **not** match the shipped
landscaping example. A clean run produces a signable `.docx` with defined
terms, a flat Schedule A grid pulled from values via `rows: $key`, and a
two-sided signature block — no landscaping, music, or rental vocabulary.

---

> Draft a Consulting Services Agreement between **Northwind Trading Co.**
> (Delaware corporation, 200 W Madison St, Chicago, IL 60606) as the
> client and **Aperture Strategy LLC** (Illinois LLC, 600 N State St,
> Chicago, IL 60654) as the consultant, effective March 1, 2026.
>
> Aperture will provide go-to-market strategy advisory work to Northwind's
> commercial team across four discrete deliverables, each with its own due
> date and fixed fee. Total engagement value of \$140,000.
>
> **Schedule A** (deliverables) — each row has a milestone name, a one-line
> description, the due date, and the fee:
>
> - Market Sizing Memo — quantitative TAM/SAM/SOM model for the
>   commercial-team segments — due March 31, 2026 — \$28,000
> - Competitive Landscape Briefing — written brief plus 90-minute
>   workshop — due April 24, 2026 — \$32,000
> - Pricing & Packaging Recommendations — strategy memo with three
>   priced scenarios — due May 22, 2026 — \$40,000
> - Go-to-Market Playbook — consolidated implementation plan and
>   90-day rollout calendar — due June 19, 2026 — \$40,000
>
> Term: runs through final acceptance of the Go-to-Market Playbook;
> automatically expires when the last deliverable is accepted unless extended
> by written change order. Either party may terminate for material breach on
> 14 days' written notice and opportunity to cure.
>
> Payment: net-30 from the acceptance of each deliverable. Northwind has 10
> business days to accept or reject each deliverable in writing; silence is
> deemed acceptance.
>
> Confidentiality: standard 3-year mutual NDA — each party protects the
> other's confidential information for three (3) years from disclosure.
>
> IP: all deliverables prepared specifically for Northwind are work-for-hire
> and assigned on payment; Aperture retains its pre-existing materials and
> any general methodology, with a perpetual license to Northwind for
> internal use.
>
> Insurance: Aperture carries professional liability of at least
> \$2,000,000 per claim and \$2,000,000 aggregate.
>
> Governing law: Illinois. Venue: Cook County, Illinois.
>
> Aperture's Managing Partner **Priya Shah** signs for Aperture. Northwind's
> Chief Commercial Officer **Daniel Ortega** signs for Northwind.

---

**Things to watch for in the rendered output:**

- **Defined terms** — after a demonstrative like "This", use the bare
  `{{$Agreement}}` introduce form, which renders as
  `Consulting Services Agreement (“Agreement”)`. Reserve `{{$the_X}}` for
  mid-sentence introductions where prose actually wants "(the X)".
  `{{$Client}}` and `{{$Consultant}}` introduce the parties with their
  full legal descriptions.
- **Static `long:` expansions** — fixed amounts and durations like the
  insurance floor, NDA term, cure period, and total engagement value live
  in `schema.X.long`, not `values:`, so they bake into the template.
- **Sentence-start capitalization** — paragraph starts use `{{The_Client}}`,
  `{{The_Parties}}` (capital `T` in marker → capital `T` in output);
  mid-sentence references use `{{the_Client}}`.
- **Schedule A grid via `rows: $deliverables`** — the four-row table pulls
  its rows from a flat `deliverables:` array in values. No `from:`
  repeater needed (single table, no per-deliverable sub-headings).
- **Two-sided signature block** — Client on left, Consultant on right;
  Daniel Ortega and Priya Shah in `sig_*_by` fields.

**Run (from project root):**

```bash
node $SKILL_DIR consulting-services-agreement.md \
  --values-file consulting-services-values.yml \
  --output Consulting_Services_Agreement.docx
```
