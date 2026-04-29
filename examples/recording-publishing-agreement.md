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

This {{$agreement}} is entered into as of the Effective Date stated below, by
and between {{$writer}} and {{$company}} identified in Section 1. Writer and
Company are referred to individually as {{$party}} and collectively as
{{$parties}}.

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

{{!writer}} is a songwriter, composer, and recording artist. {{!company}} is
engaged in the business of music production, publishing, and the ownership and
exploitation of musical compositions and master sound recordings. {{!writer}}
wishes to engage {{!company}} as the exclusive publisher of compositions written
by {{!writer}} and the exclusive owner of master recordings produced by
{{!writer}} during {{term}} of this {{!agreement}}, and {{!company}} wishes to
act in such capacity, on the terms set out below.

## 3. Term

The {{$initial_term}} shall begin on the Effective Date and continue for one (1)
year. Thereafter, this {{!agreement}} shall automatically renew for successive
one-year terms (each, {{$renewal_term}}; {{initial_term}} together with
{{renewal_terms}}, {{$term}}), unless either {{!party}} delivers written notice
of non-renewal to the other {{!party}} no later than thirty (30) days before the
end of the then-current term.

The rights granted by {{!writer}} to {{!company}} under this {{!agreement}}
shall continue with respect to each {{!composition}} and each {{!recording}} for
the full duration of copyright in such {{!composition}} or {{!recording}},
including any extensions or renewals, regardless of whether {{term}} has expired
or been terminated.

## 4. Compositions Covered

{{!Compositions}} means all original musical compositions, in whole or in part,
written, composed, created, or co-created by {{!writer}} (alone or with others)
during {{term}}, including the music, lyrics, arrangements, beats, samples, and
all related elements, in any genre, in any medium, and whether or not
commercially released. Each {{!composition}} is subject to this {{!agreement}}
automatically upon creation, without need for further documentation, although
{{parties}} shall reasonably cooperate to identify and list {{!compositions}} as
they are created.

## 5. Recordings Covered

{{!Recordings}} means all master sound recordings produced, recorded, or
co-recorded by {{!writer}} (alone or with others) during {{term}}, whether
embodying {{!compositions}} or otherwise, in any format and whether or not
commercially released. Each {{!recording}} is subject to this {{!agreement}}
automatically upon fixation, without need for further documentation, although
{{parties}} shall reasonably cooperate to identify and catalog {{!recordings}}
as they are created.

For the avoidance of doubt: {{!compositions}} written, and {{!recordings}}
fixed, by {{!writer}} prior to the Effective Date are **not** covered by this
{{!agreement}} and are addressed, if at all, by separate written assignment.

## 6. Grant of Rights — Compositions

{{!writer}} hereby irrevocably assigns and transfers to {{!company}}, throughout
the world and for the full duration of copyright (including any extensions and
renewals), {{$publishers_share}} of all right, title, and interest in and to
each {{!composition}}, including without limitation:

a. The entire publisher's share of all copyrights and all renewals and
extensions thereof in {{compositions}};

b. The right to register, license, exploit, and administer {{compositions}}
worldwide, including mechanical, synchronization, public performance, print,
digital, and any other rights;

c. The right to register {{!company}} as the publisher with one or more
performing rights organizations and mechanical rights collection societies; and

d. The right to enforce copyright in {{compositions}} and to bring or defend
actions concerning them.

{{!writer}} retains {{$writers_share}} of all royalties and rights in each
{{!composition}}, which shall be paid to {{!writer}} directly by the applicable
performing rights organization, mechanical rights organization, or other
collection society, in accordance with such organization's rules.
{{writers_share}} follows {{!writer}} personally and is not assigned to
{{!company}}.

## 7. Grant of Rights — Recordings

{{!writer}} hereby irrevocably assigns and transfers to {{!company}}, throughout
the world and for the full duration of copyright (including any extensions and
renewals), all right, title, and interest in and to each {{!recording}},
including without limitation:

a. All copyrights and all renewals and extensions thereof in the master sound
recordings of {{recordings}};

b. The right to register, license, exploit, and administer {{recordings}}
worldwide, including mechanical, synchronization, public performance,
distribution, digital, neighboring rights, and any other rights;

c. The right to register {{!company}} with applicable rights organizations,
collection societies, and digital service providers as the owner of
{{recordings}}; and

d. The right to enforce copyright in {{recordings}} and to bring or defend
actions concerning them.

## 8. Co-Writers and Co-Performers

Where a {{!composition}} is co-written, or a {{!recording}} is co-produced or
co-performed, by {{!writer}} and one or more third parties, the rights granted
under Sections 6 and 7 apply only to {{!writer}}'s pro-rata share. The shares of
any co-writer, co-producer, or co-performer shall be governed by separate
agreement and are not affected by this {{!agreement}}.

## 9. Compensation

In consideration of the rights granted under this {{!agreement}}, {{!company}}
shall:

a. Pay {{!writer}} {{writers_share}} of compositions as set out in Section 6, by
causing such share to be paid directly to {{!writer}} by the applicable rights
organizations;

b. Bear the costs of registering {{!company}} as publisher and as master rights
owner with the relevant rights organizations and digital service providers, and
of administering {{compositions}} and {{recordings}}; and

c. Provide {{!writer}} with reasonable accountings of any {{publishers_share}}
royalties or master-recording royalties received by {{!company}}, no less
frequently than annually, upon {{!writer}}'s reasonable request.

No additional advances, salary, or guaranteed payments are required under this
{{!agreement}}, {{parties}} acknowledging that {{!writer}} is a principal of
{{!company}} and benefits indirectly from {{!company}}'s ownership and
exploitation of {{compositions}} and {{recordings}}. {{parties}} may, by
separate written agreement, document any salary, advance, or other compensation
arrangement.

## 10. Representations and Warranties

{{!writer}} represents and warrants to {{!company}} that:

a. {{!writer}} has the full right, power, and authority to enter into this
{{!agreement}} and to grant the rights granted herein;

b. {{compositions}} and {{recordings}}, to the extent of {{!writer}}'s
contribution, are or will be original to {{!writer}}, and do not and will not
infringe the copyright, trademark, right of publicity, or any other right of any
third party;

c. {{!writer}} is not bound by any prior agreement that would conflict with the
rights granted to {{!company}} under this {{!agreement}}; and

d. Any third-party samples, interpolations, or licensed materials incorporated
into a {{!composition}} or {{!recording}} will be cleared by separate written
agreement, and {{!writer}} will provide such agreements to {{!company}} on
request.

## 11. Indemnification

Each {{!party}} shall indemnify the other against any third-party claim arising
out of a material breach of that {{!party}}'s representations and warranties
under this {{!agreement}}, subject to prompt written notice of the claim and
reasonable cooperation in its defense.

## 12. Termination and Non-Renewal

Either {{!party}} may terminate this {{!agreement}} for material breach by the
other {{!party}}, upon thirty (30) days' written notice and opportunity to cure.
Either {{!party}} may also decline renewal of the then-current term by giving
written notice as set out in Section 3.

Termination or non-renewal does not affect the assignments already made with
respect to {{compositions}} and {{recordings}} created during {{term}}, which
remain assigned to {{!company}} in accordance with Sections 6 and 7 for the full
duration of copyright. Termination or non-renewal only prevents future
{{!compositions}} and {{!recordings}} (those created after the effective date of
termination or expiration of {{term}}) from being covered by this
{{!agreement}}.

Upon termination or non-renewal, Sections 6, 7, 8, 10, 11, 14, 15, and 16 shall
survive.

## 13. Independent Status; Not Work-for-Hire

{{parties}} acknowledge that {{compositions}} and {{recordings}} are not
"works made for hire" within the meaning of the U.S. Copyright Act.
{{!writer}} is the author of {{compositions}} and {{recordings}}, and the rights
conveyed to {{!company}} are conveyed by assignment under Sections 6 and 7, not
by virtue of any employment relationship.

## 14. Governing Law and Venue

This {{!agreement}} is governed by the law of the State identified as the
Governing Law in Section 1, without regard to its conflict-of-laws principles.
Where Delaware is the Governing Law, venue for any dispute arising under this
{{!agreement}} shall lie exclusively in the state or federal courts located in
New Castle County, Delaware.

## 15. General Provisions

This {{!agreement}} constitutes the entire agreement between {{parties}} with
respect to its subject matter and supersedes any prior understandings between
{{parties}} relating to the publishing or master ownership of compositions or
recordings created on or after the Effective Date, including any prior Exclusive
Songwriter Agreement between {{parties}} to the extent it would otherwise govern
such compositions or recordings. No amendment is effective unless in writing and
signed by both {{parties}}. If any provision is found unenforceable, the
remainder of this {{!agreement}} shall remain in effect. {{!agreement}} may be
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
