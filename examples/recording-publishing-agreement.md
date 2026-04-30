---
title: EXCLUSIVE RECORDING AND PUBLISHING AGREEMENT
output: /home/claude/work/Recording_Publishing_Agreement.docx

schema:
  # Defined terms used in the body.
  agreement:        { long: "Exclusive Recording and Publishing Agreement" }
  writer:           { long: "Writer (also serving as the recording artist)" }
  company:          { long: "Company" }
  party:            { term: "Party", article: "a", plural_article: "the" }     # "a Party" / "the Parties"
  initial_term:     { term: "Initial Term", long: "initial term of this Agreement" }
  renewal_term:     { term: "Renewal Term", article: "a", plural_article: "any" }
  term:             { term: "Term" }
  composition:      { term: "Composition" }    # plural auto-derives: Compositions
  recording:        { term: "Recording" }      # plural auto-derives: Recordings
  publishers_share: { term: "Publisher's Share", long: "a 50% share" }
  writers_share:    { term: "Writer's Share",    long: "a 50% share" }

  # Form fields filled at render time. Pass via --values-file, --set, or stdin.
  effective_date:     { type: date,   required: true }
  writer_name:        { type: string, required: true, description: "Writer legal name" }
  writer_address:     { type: string, required: true }
  company_name:       { type: string, required: true, description: "Company legal name" }
  company_state:      { type: string, required: true, description: "Company state of incorporation" }
  company_address:    { type: string, required: true }
  governing_law:      { type: string, default: "State of Delaware" }
  sig_writer_name:    string
  sig_writer_email:   string
  sig_company_entity: string
  sig_company_by:     string
  sig_company_title:  string
---

This {{$the_Agreement}} is entered into as of the Effective Date stated below, by
and between {{$the_Writer}} and {{$the_Company}} identified in Section 1. Writer and
Company are referred to individually as {{$a_Party}} and collectively as
{{$the_Parties}}.

## 1. Parties and Effective Date

```fields
effective_date
writer_name
writer_address
company_name
company_state
company_address
governing_law
```

## 2. Background

{{Writer}} is a songwriter, composer, and recording artist. {{Company}} is
engaged in the business of music production, publishing, and the ownership and
exploitation of musical compositions and master sound recordings. {{Writer}}
wishes to engage {{Company}} as the exclusive publisher of compositions written
by {{Writer}} and the exclusive owner of master recordings produced by
{{Writer}} during {{the_Term}} of this {{Agreement}}, and {{Company}} wishes to act
in such capacity, on the terms set out below.

## 3. Term

The {{$the_Initial_term}} shall begin on the Effective Date and continue for one (1)
year. Thereafter, this {{Agreement}} shall automatically renew for successive
one-year terms (each, {{$a_Renewal_term}}; {{the_Initial_term}} together with any
{{Renewal_terms}}, {{$the_Term}}), unless either {{Party}} delivers written notice
of non-renewal to the other {{Party}} no later than thirty (30) days before the
end of the then-current term.

The rights granted by {{Writer}} to {{Company}} under this {{Agreement}} shall
continue with respect to each {{Composition}} and each {{Recording}} for the
full duration of copyright in such {{Composition}} or {{Recording}}, including
any extensions or renewals, regardless of whether {{the_Term}} has expired or been
terminated.

## 4. Compositions Covered

{{!Compositions}} means all original musical compositions, in whole or in part,
written, composed, created, or co-created by {{Writer}} (alone or with others)
during {{the_Term}}, including the music, lyrics, arrangements, beats, samples, and
all related elements, in any genre, in any medium, and whether or not
commercially released. Each {{Composition}} is subject to this {{Agreement}}
automatically upon creation, without need for further documentation, although
{{the_Parties}} shall reasonably cooperate to identify and list {{the_Compositions}} as
they are created.

## 5. Recordings Covered

{{!Recordings}} means all master sound recordings produced, recorded, or
co-recorded by {{Writer}} (alone or with others) during {{the_Term}}, whether
embodying {{the_Compositions}} or otherwise, in any format and whether or not
commercially released. Each {{Recording}} is subject to this {{Agreement}}
automatically upon fixation, without need for further documentation, although
{{the_Parties}} shall reasonably cooperate to identify and catalog {{the_Recordings}} as
they are created.

For the avoidance of doubt: {{The_Compositions}} written, and {{the_Recordings}} fixed,
by {{Writer}} prior to the Effective Date are **not** covered by this
{{Agreement}} and are addressed, if at all, by separate written assignment.

## 6. Grant of Rights — Compositions

{{Writer}} hereby irrevocably assigns and transfers to {{Company}}, throughout
the world and for the full duration of copyright (including any extensions and
renewals), {{$the_Publishers_share}} of all right, title, and interest in and to
each {{Composition}}, including without limitation:

a. The entire publisher's share of all copyrights and all renewals and
extensions thereof in {{the_Compositions}};

b. The right to register, license, exploit, and administer {{the_Compositions}}
worldwide, including mechanical, synchronization, public performance, print,
digital, and any other rights;

c. The right to register {{Company}} as the publisher with one or more
performing rights organizations and mechanical rights collection societies; and

d. The right to enforce copyright in {{the_Compositions}} and to bring or defend
actions concerning them.

{{Writer}} retains {{$the_Writers_share}} of all royalties and rights in each
{{Composition}}, which shall be paid to {{Writer}} directly by the applicable
performing rights organization, mechanical rights organization, or other
collection society, in accordance with such organization's rules.
{{The_Writers_share}} follows {{Writer}} personally and is not assigned to
{{Company}}.

## 7. Grant of Rights — Recordings

{{Writer}} hereby irrevocably assigns and transfers to {{Company}}, throughout
the world and for the full duration of copyright (including any extensions and
renewals), all right, title, and interest in and to each {{Recording}},
including without limitation:

a. All copyrights and all renewals and extensions thereof in the master sound
recordings of {{the_Recordings}};

b. The right to register, license, exploit, and administer {{the_Recordings}}
worldwide, including mechanical, synchronization, public performance,
distribution, digital, neighboring rights, and any other rights;

c. The right to register {{Company}} with applicable rights organizations,
collection societies, and digital service providers as the owner of
{{the_Recordings}}; and

d. The right to enforce copyright in {{the_Recordings}} and to bring or defend
actions concerning them.

## 8. Co-Writers and Co-Performers

Where a {{Composition}} is co-written, or a {{Recording}} is co-produced or
co-performed, by {{Writer}} and one or more third parties, the rights granted
under Sections 6 and 7 apply only to {{Writer}}'s pro-rata share. The shares of
any co-writer, co-producer, or co-performer shall be governed by separate
agreement and are not affected by this {{Agreement}}.

## 9. Compensation

In consideration of the rights granted under this {{Agreement}}, {{Company}}
shall:

a. Pay {{Writer}} {{the_Writers_share}} of compositions as set out in Section 6, by
causing such share to be paid directly to {{Writer}} by the applicable rights
organizations;

b. Bear the costs of registering {{Company}} as publisher and as master rights
owner with the relevant rights organizations and digital service providers, and
of administering {{the_Compositions}} and {{the_Recordings}}; and

c. Provide {{Writer}} with reasonable accountings of any {{the_Publishers_share}}
royalties or master-recording royalties received by {{Company}}, no less
frequently than annually, upon {{Writer}}'s reasonable request.

No additional advances, salary, or guaranteed payments are required under this
{{Agreement}}, {{the_Parties}} acknowledging that {{Writer}} is a principal of
{{Company}} and benefits indirectly from {{Company}}'s ownership and
exploitation of {{the_Compositions}} and {{the_Recordings}}. {{The_Parties}} may, by
separate written agreement, document any salary, advance, or other compensation
arrangement.

## 10. Representations and Warranties

{{Writer}} represents and warrants to {{Company}} that:

a. {{Writer}} has the full right, power, and authority to enter into this
{{Agreement}} and to grant the rights granted herein;

b. {{The_Compositions}} and {{the_Recordings}}, to the extent of {{Writer}}'s
contribution, are or will be original to {{Writer}}, and do not and will not
infringe the copyright, trademark, right of publicity, or any other right of any
third party;

c. {{Writer}} is not bound by any prior agreement that would conflict with the
rights granted to {{Company}} under this {{Agreement}}; and

d. Any third-party samples, interpolations, or licensed materials incorporated
into a {{Composition}} or {{Recording}} will be cleared by separate written
agreement, and {{Writer}} will provide such agreements to {{Company}} on
request.

## 11. Indemnification

Each {{Party}} shall indemnify the other against any third-party claim arising
out of a material breach of that {{Party}}'s representations and warranties
under this {{Agreement}}, subject to prompt written notice of the claim and
reasonable cooperation in its defense.

## 12. Termination and Non-Renewal

Either {{Party}} may terminate this {{Agreement}} for material breach by the
other {{Party}}, upon thirty (30) days' written notice and opportunity to cure.
Either {{Party}} may also decline renewal of the then-current term by giving
written notice as set out in Section 3.

Termination or non-renewal does not affect the assignments already made with
respect to {{the_Compositions}} and {{the_Recordings}} created during {{the_Term}}, which
remain assigned to {{Company}} in accordance with Sections 6 and 7 for the full
duration of copyright. Termination or non-renewal only prevents future
{{the_Compositions}} and {{the_Recordings}} (those created after the effective date of
termination or expiration of {{the_Term}}) from being covered by this {{Agreement}}.

Upon termination or non-renewal, Sections 6, 7, 8, 10, 11, 14, 15, and 16 shall
survive.

## 13. Independent Status; Not Work-for-Hire

{{the_Parties}} acknowledge that {{the_Compositions}} and {{the_Recordings}} are not "works
made for hire" within the meaning of the U.S. Copyright Act. {{Writer}} is the
author of {{the_Compositions}} and {{the_Recordings}}, and the rights conveyed to
{{Company}} are conveyed by assignment under Sections 6 and 7, not by virtue of
any employment relationship.

## 14. Governing Law and Venue

This {{Agreement}} is governed by the law of the State identified as the
Governing Law in Section 1, without regard to its conflict-of-laws principles.
Where Delaware is the Governing Law, venue for any dispute arising under this
{{Agreement}} shall lie exclusively in the state or federal courts located in
New Castle County, Delaware.

## 15. General Provisions

This {{Agreement}} constitutes the entire agreement between {{the_Parties}} with
respect to its subject matter and supersedes any prior understandings between
{{the_Parties}} relating to the publishing or master ownership of compositions or
recordings created on or after the Effective Date, including any prior Exclusive
Songwriter Agreement between {{the_Parties}} to the extent it would otherwise govern
such compositions or recordings. No amendment is effective unless in writing and
signed by both {{the_Parties}}. If any provision is found unenforceable, the
remainder of this {{Agreement}} shall remain in effect. {{Agreement}} may be
executed in counterparts, including by electronic signature, each of which is
deemed an original.

## 16. Signatures {.pageBreak}

Agreed and accepted as of the Effective Date:

```sig
WRITER || COMPANY
Name | sig_writer_name        || Entity     | sig_company_entity
Email | sig_writer_email      || By (name)  | sig_company_by
                              || Title      | sig_company_title
Signature [tall]              || Signature [tall]
Date                          || Date
```
