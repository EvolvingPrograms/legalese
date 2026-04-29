---
title: COPYRIGHT ASSIGNMENT OF EXISTING RECORDINGS
output: /home/claude/work/Recording_Assignment.docx

schema:
  # Defined terms used in the body.
  assignment:       { long: "Copyright Assignment" }
  assignor:         { long: "Assignor" }
  assignee:         { long: "Assignee" }
  party:            { term: "Party", article: "a", plural_article: "the" }     # "a Party" / "the Parties"
  recording:        { term: "Recording", article: "a", plural_article: "the" } # "(each, a Recording)" / "the Recordings"
  publishers_share: { term: "Publisher's Share", long: "a 50% share" }
  writers_share:    { term: "Writer's Share",    long: "a 50% share" }

  # Form fields filled at render time. Pass via --values-file, --set, or stdin.
  effective_date:      { type: date,   required: true }
  assignor_name:       { type: string, required: true, description: "Assignor legal name" }
  assignor_address:    { type: string, required: true }
  assignee_name:       { type: string, required: true, description: "Assignee legal name" }
  assignee_state:      { type: string, required: true, description: "Assignee state of incorporation" }
  assignee_address:    { type: string, required: true }
  governing_law:       { type: string, default: "State of Delaware" }
  sig_assignor_name:   string
  sig_assignor_email:  string
  sig_assignee_entity: string
  sig_assignee_by:     string
  sig_assignee_title:  string
---

This {{$assignment}} is made as of the Effective Date stated below, by {{$assignor}} in favor of {{$assignee}} identified in Section 1.

## 1. Parties and Effective Date

```fields
effective_date
assignor_name
assignor_address
assignee_name
assignee_state
assignee_address
governing_law
```

## 2. Background

{{!assignor}} is the author and owner of the sound recordings and underlying musical compositions listed in Schedule A (each, {{$recording}}, and collectively {{$recordings}}), released prior to the Effective Date of this {{!assignment}}.

{{parties}} have entered, or are concurrently entering, into a separate Exclusive Songwriter Agreement under which {{!assignee}} acts as the publisher of compositions written by {{!assignor}} on a forward-looking basis. {{parties}} wish to bring the previously released {{!recordings}} listed in Schedule A under {{!assignee}}'s ownership and administration, by way of this {{!assignment}}.

## 3. Assignment of Rights

{{!assignor}} hereby irrevocably assigns and transfers to {{!assignee}}, throughout the world and for the full duration of copyright (including any extensions and renewals), all right, title, and interest in and to each of {{recordings}}, including without limitation:

a. All copyrights and all renewals and extensions thereof in the master sound recordings of {{recordings}};
b. {{$publishers_share}} of the underlying musical compositions embodied in {{recordings}};
c. The right to register, license, exploit, and administer {{recordings}} worldwide, including mechanical, synchronization, public performance, print, digital, distribution, and any other rights;
d. The right to register {{!assignee}} with applicable performing rights organizations, mechanical rights organizations, and digital service providers as the owner of {{recordings}}; and
e. The right to enforce copyright in {{recordings}} and to bring or defend actions concerning them.

## 4. Reservation of Writer's Share

{{!assignor}} retains {{$writers_share}} of the underlying musical compositions embodied in {{recordings}}, which shall be paid to {{!assignor}} directly by the applicable performing rights organization, mechanical rights organization, or other collection society. {{writers_share}} follows {{!assignor}} personally and is not assigned to {{!assignee}} under this {{!assignment}}.

## 5. Co-Writers and Co-Performers

Where {{recording}} listed in Schedule A involves contributions from one or more third parties, this {{!assignment}} applies only to {{!assignor}}'s pro-rata share of the underlying composition and to {{!assignor}}'s interest in the master sound recording. Any third-party shares are governed by separate agreement and are not affected by this {{!assignment}}.

## 6. Representations and Warranties

{{!assignor}} represents and warrants that:

a. {{!assignor}} has the full right, power, and authority to make this {{!assignment}};
b. {{recordings}}, to the extent of {{!assignor}}'s contribution, are original to {{!assignor}} and do not infringe any third-party right;
c. {{!assignor}} has not previously assigned the rights granted under this {{!assignment}} to any other party, except as disclosed in Schedule A; and
d. Any third-party samples, interpolations, or licensed materials incorporated into {{recording}} have been cleared by separate written agreement, and {{!assignor}} will provide such agreements to {{!assignee}} on request.

## 7. Further Assurances

{{!assignor}} agrees to execute and deliver, on {{!assignee}}'s reasonable request and at {{!assignee}}'s expense, any additional documents reasonably necessary to perfect, register, or enforce the rights assigned under this {{!assignment}}, including documents required by performing rights organizations, mechanical rights organizations, digital service providers, the U.S. Copyright Office, or any other applicable authority.

## 8. Governing Law and Venue

This {{!assignment}} is governed by the law of the State identified as the Governing Law in Section 1, without regard to its conflict-of-laws principles. Where Delaware is the Governing Law, venue for any dispute arising under this {{!assignment}} shall lie exclusively in the state or federal courts located in New Castle County, Delaware.

## 9. General Provisions

This {{!assignment}}, together with the Exclusive Songwriter Agreement between {{parties}}, constitutes the entire agreement between {{parties}} with respect to {{recordings}} listed in Schedule A. No amendment is effective unless in writing and signed by both {{parties}}. If any provision is unenforceable, the remainder shall remain in effect. This {{!assignment}} may be executed in counterparts, including by electronic signature, each of which is deemed an original.

## 10. Signatures {.pageBreak}

Agreed and accepted as of the Effective Date:

```sig
ASSIGNOR || ASSIGNEE
Name | sig_assignor_name        || Entity     | sig_assignee_entity
Email | sig_assignor_email      || By (name)  | sig_assignee_by
                                || Title      | sig_assignee_title
Signature [tall]                || Signature [tall]
Date                            || Date
```

# SCHEDULE A — ASSIGNED RECORDINGS {.pageBreak}

The following {{!recordings}} are assigned to {{!assignee}} under this {{!assignment}}. Each release is identified by its UPC and release date; each {{!recording}} within a release is identified by its ISRC.

```grids
# `from:` accepts YAML file paths (loaded from disk, relative to this .md
# file) or inline objects. Both shapes are processed identically — the
# `heading:` template and `rows:` dot-path apply to whatever object the entry
# resolves to. Mix and match freely.
from:
  - ./recording-data.yml          # path: loaded from disk
  - album:                         # inline object: same shape as the file
      title: "Sample EP"
      release_type: "EP"
      upc: "0000000000002"
      release_date: "2026-02-20"
      copyright: "© 2026 Sample Records"
    tracks:
      - { n: 1, title: "Inline Track A", duration: "03:30", isrc: "XXXXX2600101" }
      - { n: 2, title: "Inline Track B", duration: "02:55", isrc: "XXXXX2600102" }
heading: "{album.title} ({album.release_type}) — UPC {album.upc} • released {album.release_date} • {album.copyright}"
rows: tracks
columns:
  - {label: '#',        key: 'n',        width: 600}
  - {label: 'Title',    key: 'title',    width: 5000}
  - {label: 'Duration', key: 'duration', width: 1300}
  - {label: 'ISRC',     key: 'isrc',     width: 2460}
```
