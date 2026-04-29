---
title: COPYRIGHT ASSIGNMENT OF EXISTING RECORDINGS
output: /home/claude/work/Recording_Assignment.docx
values:
  effective_date: ""
  assignor_name: ""
  assignor_address: ""
  assignee_name: ""
  assignee_state: ""
  assignee_address: ""
  governing_law: ""
  sig_assignor_name: ""
  sig_assignor_email: ""
  sig_assignee_entity: ""
  sig_assignee_by: ""
  sig_assignee_title: ""
---

This Copyright Assignment {{Assignment}} is made as of the Effective Date stated below, by the Assignor {{Assignor}} in favor of the Assignee {{Assignee}} identified in Section 1.

## 1. Parties and Effective Date

```fields
Effective Date | effective_date
Assignor (legal name) | assignor_name
Assignor address | assignor_address
Assignee (legal name) | assignee_name
Assignee state of incorporation | assignee_state
Assignee address | assignee_address
Governing law | governing_law
```

## 2. Background

Assignor is the author and owner of the sound recordings and underlying musical compositions listed in Schedule A (each, a ***"Recording"***, and collectively the ***"Recordings"***), released prior to the Effective Date of this Assignment.

The Parties have entered, or are concurrently entering, into a separate Exclusive Songwriter Agreement under which Assignee acts as the publisher of compositions written by Assignor on a forward-looking basis. The Parties wish to bring the previously released Recordings listed in Schedule A under Assignee's ownership and administration, by way of this Assignment.

## 3. Assignment of Rights

Assignor hereby irrevocably assigns and transfers to Assignee, throughout the world and for the full duration of copyright (including any extensions and renewals), all right, title, and interest in and to each of the Recordings, including without limitation:

a. all copyrights and all renewals and extensions thereof in the master sound recordings of the Recordings;
b. the **Publisher's Share** (50%) of the underlying musical compositions embodied in the Recordings;
c. the right to register, license, exploit, and administer the Recordings worldwide, including mechanical, synchronization, public performance, print, digital, distribution, and any other rights;
d. the right to register Assignee with applicable performing rights organizations, mechanical rights organizations, and digital service providers as the owner of the Recordings; and
e. the right to enforce copyright in the Recordings and to bring or defend actions concerning them.

## 4. Reservation of Writer's Share

Assignor retains the **Writer's Share** (50%) of the underlying musical compositions embodied in the Recordings, which shall be paid to Assignor directly by the applicable performing rights organization, mechanical rights organization, or other collection society. The Writer's Share follows Assignor personally and is not assigned to Assignee under this Assignment.

## 5. Co-Writers and Co-Performers

Where a Recording listed in Schedule A involves contributions from one or more third parties, this Assignment applies only to Assignor's pro-rata share of the underlying composition and to Assignor's interest in the master sound recording. Any third-party shares are governed by separate agreement and are not affected by this Assignment.

## 6. Representations and Warranties

Assignor represents and warrants that:

a. Assignor has the full right, power, and authority to make this Assignment;
b. the Recordings, to the extent of Assignor's contribution, are original to Assignor and do not infringe any third-party right;
c. Assignor has not previously assigned the rights granted under this Assignment to any other party, except as disclosed in Schedule A; and
d. any third-party samples, interpolations, or licensed materials incorporated into a Recording have been cleared by separate written agreement, and Assignor will provide such agreements to Assignee on request.

## 7. Further Assurances

Assignor agrees to execute and deliver, on Assignee's reasonable request and at Assignee's expense, any additional documents reasonably necessary to perfect, register, or enforce the rights assigned under this Assignment, including documents required by performing rights organizations, mechanical rights organizations, digital service providers, the U.S. Copyright Office, or any other applicable authority.

## 8. Governing Law and Venue

This Assignment is governed by the law of the State identified as the Governing Law in Section 1, without regard to its conflict-of-laws principles. Where Delaware is the Governing Law, venue for any dispute arising under this Assignment shall lie exclusively in the state or federal courts located in New Castle County, Delaware.

## 9. General Provisions

This Assignment, together with the Exclusive Songwriter Agreement between the Parties, constitutes the entire agreement between the Parties with respect to the Recordings listed in Schedule A. No amendment is effective unless in writing and signed by both Parties. If any provision is unenforceable, the remainder shall remain in effect. This Assignment may be executed in counterparts, including by electronic signature, each of which is deemed an original.

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

The following Recordings are assigned to Assignee under this Assignment. Each release is identified by its UPC and release date; each Recording within a release is identified by its ISRC.

```grids
# `from:` accepts either JSON file paths (loaded from disk, relative to this
# .md file) or inline objects. Both shapes are processed identically — the
# `heading:` template and `rows:` dot-path apply to whatever object the entry
# resolves to. Mix and match freely.
from:
  - ./sample.json                       # path: loaded from disk
  - album:                              # inline object: same shape as the JSON
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
