const {
  build, h1, h2, p, b, bi, dt, list, spacer,
  fieldTable, signatureTable, gridTable,
} = require('./doc-builder');

// ===== DEAL VALUES =====
const values = {
  effective_date:           '',
  assignor_name:            '',
  assignor_address:         '',
  assignee_name:            '',
  assignee_state:           '',
  assignee_address:         '',
  governing_law:            'State of Texas',

  sig_assignor_name:        '',
  sig_assignor_email:       '',
  sig_assignee_entity:      '',
  sig_assignee_by:          '',
  sig_assignee_title:       '',
};

// Schedule A rows. Empty objects render as blank rows for hand-fill.
const schedule_rows = Array.from({ length: 10 }, () => ({}));

build({
  title: 'COPYRIGHT ASSIGNMENT OF EXISTING COMPOSITIONS',
  output: '/home/claude/work/Copyright_Assignment.docx',
  body: [
    p('This Copyright Assignment', dt('Assignment'),
      ' is made as of the Effective Date stated below, by the Assignor', dt('Assignor'),
      ' in favor of the Assignee', dt('Assignee'),
      ' identified in Section 1.'),

    h2('1. Parties and Effective Date'),
    fieldTable(values, [
      ['Effective Date',                    'effective_date'],
      ['Assignor (legal name)',             'assignor_name'],
      ['Assignor address',                  'assignor_address'],
      ['Assignee (legal name)',             'assignee_name'],
      ['Assignee state of incorporation',   'assignee_state'],
      ['Assignee address',                  'assignee_address'],
      ['Governing law',                     'governing_law'],
    ]),
    spacer(),

    h2('2. Background'),
    p('Assignor is the author and owner of the musical compositions listed in Schedule A (each, a ',
      bi('\u201CComposition\u201D'), ', and collectively the ', bi('\u201CCompositions\u201D'),
      '), which were created by Assignor prior to the Effective Date of this Assignment.'),
    p('The Parties have entered, or are concurrently entering, into an Exclusive Songwriter Agreement under which Assignee acts as the publisher of compositions written by Assignor on a forward-looking basis. The Parties wish to bring the Compositions listed in Schedule A under the same publishing arrangement, by way of this Assignment.'),

    h2('3. Assignment of Publisher\u2019s Share'),
    p('Assignor hereby irrevocably assigns and transfers to Assignee, throughout the world and for the full duration of copyright (including any extensions and renewals), the ',
      b('Publisher\u2019s Share'),
      ' (50%) of all right, title, and interest in and to each of the Compositions, including without limitation:'),
    list(
      'the entire publisher\u2019s share of all copyrights and all renewals and extensions thereof in the Compositions;',
      'the right to register, license, exploit, and administer the Compositions worldwide, including mechanical, synchronization, public performance, print, digital, and any other rights;',
      'the right to register Assignee as the publisher with one or more performing rights organizations and mechanical rights collection societies; and',
      'the right to enforce copyright in the Compositions and to bring or defend actions concerning them.',
    ),

    h2('4. Reservation of Writer\u2019s Share'),
    p('Assignor retains the ', b('Writer\u2019s Share'),
      ' (50%) of all royalties and rights in each Composition, which shall be paid to Assignor directly by the applicable performing rights organization, mechanical rights organization, or other collection society. The Writer\u2019s Share follows Assignor personally and is not assigned to Assignee under this Assignment.'),

    h2('5. Co-Writers'),
    p('Where a Composition listed in Schedule A is co-written by Assignor and one or more third parties, this Assignment applies only to Assignor\u2019s pro-rata share, as identified in Schedule A. The shares of any co-writer are governed by separate agreement and are not affected by this Assignment.'),

    h2('6. Representations and Warranties'),
    p('Assignor represents and warrants that:'),
    list(
      'Assignor has the full right, power, and authority to make this Assignment;',
      'the Compositions, to the extent of Assignor\u2019s contribution, are original to Assignor and do not infringe any third-party right;',
      'Assignor has not previously assigned the rights granted under this Assignment to any other party, except as disclosed in Schedule A; and',
      'any third-party samples, interpolations, or licensed materials incorporated into a Composition have been cleared by separate written agreement, and Assignor will provide such agreements to Assignee on request.',
    ),

    h2('7. Further Assurances'),
    p('Assignor agrees to execute and deliver, on Assignee\u2019s reasonable request and at Assignee\u2019s expense, any additional documents reasonably necessary to perfect, register, or enforce the rights assigned under this Assignment, including documents required by performing rights organizations, mechanical rights organizations, the U.S. Copyright Office, or any other applicable authority.'),

    h2('8. Governing Law and Venue'),
    p('This Assignment is governed by the law of the State identified as the Governing Law in Section 1, without regard to its conflict-of-laws principles. Where Texas is the Governing Law, venue for any dispute arising under this Assignment shall lie exclusively in the state or federal courts located in Travis County, Texas.'),

    h2('9. General Provisions'),
    p('This Assignment, together with the Exclusive Songwriter Agreement between the Parties, constitutes the entire agreement between the Parties with respect to the Compositions listed in Schedule A. No amendment is effective unless in writing and signed by both Parties. If any provision is unenforceable, the remainder shall remain in effect. This Assignment may be executed in counterparts, including by electronic signature, each of which is deemed an original.'),

    h2('10. Signatures', { pageBreak: true }),
    p('Agreed and accepted as of the Effective Date:'),
    signatureTable(values, {
      left: {
        header: 'ASSIGNOR',
        rows: [
          ['Name',      'sig_assignor_name'],
          ['Email',     'sig_assignor_email'],
          ['',          null],
          ['Signature', null, { tall: true }],
          ['Date',      null],
        ],
      },
      right: {
        header: 'ASSIGNEE',
        rows: [
          ['Entity',    'sig_assignee_entity'],
          ['By (name)', 'sig_assignee_by'],
          ['Title',     'sig_assignee_title'],
          ['Signature', null, { tall: true }],
          ['Date',      null],
        ],
      },
    }),

    // ----- Schedule A on a fresh page -----
    h1('SCHEDULE A \u2014 ASSIGNED COMPOSITIONS', { pageBreak: true }),
    p('The following Compositions are assigned to Assignee under this Assignment. Add or remove rows as needed.'),
    gridTable({
      columns: [
        { label: '#',                   key: '#',         width: 600 },
        { label: 'Composition title',   key: 'title',     width: 2700 },
        { label: 'Co-writers (if any)', key: 'cowriters', width: 2400 },
        { label: 'Assignor share',      key: 'share',     width: 1500 },
        { label: 'Notes / disclosures', key: 'notes',     width: 2160 },
      ],
      rows: schedule_rows,
    }),
  ],
}).then(p => console.log('Wrote', p));
