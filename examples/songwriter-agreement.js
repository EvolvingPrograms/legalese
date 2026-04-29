const {
  build, h2, p, b, bi, dt, list, spacer,
  fieldTable, signatureTable,
} = require('./doc-builder');

// ===== DEAL VALUES — edit these, then rerun =====
const values = {
  effective_date:        '',
  writer_name:           '',
  writer_address:        '',
  company_name:          '',
  company_state:         '',
  company_address:       '',
  governing_law:         'State of Texas',

  sig_writer_name:       '',
  sig_writer_email:      '',
  sig_company_entity:    '',
  sig_company_by:        '',
  sig_company_title:     '',
};

build({
  title: 'EXCLUSIVE SONGWRITER AGREEMENT',
  output: '/home/claude/work/Songwriter_Agreement.docx',
  body: [
    p('This Exclusive Songwriter Agreement', dt('Agreement'),
      ' is entered into as of the Effective Date stated below, by and between the Writer',
      dt('Writer'), ' and the Company', dt('Company'),
      ' identified in Section 1. Writer and Company are referred to individually as a ',
      bi('\u201CParty\u201D'), ' and collectively as the ', bi('\u201CParties\u201D'), '.'),

    h2('1. Parties and Effective Date'),
    fieldTable(values, [
      ['Effective Date',                   'effective_date'],
      ['Writer (legal name)',              'writer_name'],
      ['Writer address',                   'writer_address'],
      ['Company (legal name)',             'company_name'],
      ['Company state of incorporation',   'company_state'],
      ['Company address',                  'company_address'],
      ['Governing law',                    'governing_law'],
    ]),
    spacer(),

    h2('2. Background'),
    p('Writer is a songwriter and recording artist. Company is engaged in the business of music production, publishing, and the ownership and exploitation of musical compositions and master recordings. Writer wishes to engage Company as the exclusive publisher of musical compositions written by Writer during the Term of this Agreement, and Company wishes to act in such capacity, on the terms set out below.'),

    h2('3. Term'),
    p('The term of this Agreement', dt('Term'),
      ' shall begin on the Effective Date and continue until terminated in accordance with Section 10. The rights granted by Writer to Company under this Agreement shall, however, continue with respect to each Composition for the full duration of copyright in such Composition, including any extensions or renewals.'),

    h2('4. Compositions Covered'),
    p(bi('\u201CCompositions\u201D'),
      ' means all original musical compositions, in whole or in part, written, composed, created, or co-created by Writer (alone or with others) during the Term, including the music, lyrics, arrangements, beats, samples, and all related elements, in any genre, in any medium, and whether or not commercially released. Each Composition is subject to this Agreement automatically upon creation, without need for further documentation, although the Parties shall reasonably cooperate to identify and list Compositions as they are created.'),
    p('For the avoidance of doubt: pre-existing compositions written by Writer prior to the Effective Date are ',
      b('not'),
      ' covered by this Agreement and are addressed, if at all, by separate written assignment.'),

    h2('5. Grant of Rights'),
    p('Writer hereby irrevocably assigns and transfers to Company, throughout the world and for the full duration of copyright (including any extensions and renewals), the ',
      b('Publisher\u2019s Share'),
      ' (50%) of all right, title, and interest in and to each Composition, including without limitation:'),
    list(
      'the entire publisher\u2019s share of all copyrights and all renewals and extensions thereof in the Compositions;',
      'the right to register, license, exploit, and administer the Compositions worldwide, including mechanical, synchronization, public performance, print, digital, and any other rights;',
      'the right to register Company as the publisher with one or more performing rights organizations and mechanical rights collection societies; and',
      'the right to enforce copyright in the Compositions and to bring or defend actions concerning them.',
    ),
    p('Writer retains the ', b('Writer\u2019s Share'),
      ' (50%) of all royalties and rights in each Composition, which shall be paid to Writer directly by the applicable performing rights organization, mechanical rights organization, or other collection society, in accordance with such organization\u2019s rules. The Writer\u2019s Share follows Writer personally and is not assigned to Company.'),

    h2('6. Co-Writers and Pro-Rata Allocation'),
    p('Where a Composition is co-written by Writer and one or more third parties (each a ',
      bi('\u201CCo-Writer\u201D'),
      '), the rights granted under Section 5 apply only to Writer\u2019s pro-rata share of the Composition. The shares of any Co-Writer shall be governed by separate agreement between Writer (or Company) and such Co-Writer, and Company\u2019s rights under this Agreement extend solely to Writer\u2019s portion.'),

    h2('7. Compensation'),
    p('In consideration of the rights granted under this Agreement, Company shall:'),
    list(
      'pay Writer the Writer\u2019s Share as set out in Section 5, by causing such share to be paid directly to Writer by the applicable rights organizations;',
      'bear the costs of registering Company as publisher with the relevant rights organizations and of administering the Compositions; and',
      'provide Writer with reasonable accountings of any Publisher\u2019s Share royalties received by Company, no less frequently than annually, upon Writer\u2019s reasonable request.',
    ),
    p('No additional advances, salary, or guaranteed payments are required under this Agreement, the Parties acknowledging that Writer is a principal of Company and benefits indirectly from Company\u2019s receipt of the Publisher\u2019s Share. The Parties may, by separate written agreement, document any salary, advance, or other compensation arrangement.'),

    h2('8. Representations and Warranties'),
    p('Writer represents and warrants to Company that:'),
    list(
      'Writer has the full right, power, and authority to enter into this Agreement and to grant the rights granted herein;',
      'the Compositions, to the extent of Writer\u2019s contribution, are or will be original to Writer, and do not and will not infringe the copyright, trademark, right of publicity, or any other right of any third party;',
      'Writer is not bound by any prior agreement that would conflict with the rights granted to Company under this Agreement; and',
      'any third-party samples, interpolations, or licensed materials incorporated into a Composition will be cleared by separate written agreement, and Writer will provide such agreements to Company on request.',
    ),

    h2('9. Indemnification'),
    p('Each Party shall indemnify the other against any third-party claim arising out of a material breach of that Party\u2019s representations and warranties under this Agreement, subject to prompt written notice of the claim and reasonable cooperation in its defense.'),

    h2('10. Termination'),
    p('Either Party may terminate this Agreement on sixty (60) days\u2019 written notice to the other Party. Termination does not affect the assignments already made with respect to Compositions created before termination, which remain assigned to Company in accordance with Section 5 for the full duration of copyright. Termination only prevents future Compositions (those created after the effective date of termination) from being covered by this Agreement.'),
    p('Upon termination, Sections 5, 6, 8, 9, 11, 12, and 13 shall survive.'),

    h2('11. Independent Status; Not Work-for-Hire'),
    p('The Parties acknowledge that the Compositions are not ',
      bi('\u201Cworks made for hire\u201D'),
      ' within the meaning of the U.S. Copyright Act. Writer is the author of the Compositions, and the rights conveyed to Company are conveyed by assignment under Section 5, not by virtue of any employment relationship.'),

    h2('12. Governing Law and Venue'),
    p('This Agreement is governed by the law of the State identified as the Governing Law in Section 1, without regard to its conflict-of-laws principles. Where Texas is the Governing Law, venue for any dispute arising under this Agreement shall lie exclusively in the state or federal courts located in Travis County, Texas.'),

    h2('13. General Provisions'),
    p('This Agreement constitutes the entire agreement between the Parties with respect to its subject matter and supersedes any prior understandings. No amendment is effective unless in writing and signed by both Parties. If any provision is found unenforceable, the remainder of the Agreement shall remain in effect. This Agreement may be executed in counterparts, including by electronic signature, each of which is deemed an original.'),

    h2('14. Signatures', { pageBreak: true }),
    p('Agreed and accepted as of the Effective Date:'),
    signatureTable(values, {
      left: {
        header: 'WRITER',
        rows: [
          ['Name',      'sig_writer_name'],
          ['Email',     'sig_writer_email'],
          ['',          null],
          ['Signature', null, { tall: true }],
          ['Date',      null],
        ],
      },
      right: {
        header: 'COMPANY',
        rows: [
          ['Entity',    'sig_company_entity'],
          ['By (name)', 'sig_company_by'],
          ['Title',     'sig_company_title'],
          ['Signature', null, { tall: true }],
          ['Date',      null],
        ],
      },
    }),
  ],
}).then(p => console.log('Wrote', p));
