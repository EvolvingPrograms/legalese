// Phase-1 parity test: the new markdsl-based substituter must produce
// identical output to the legacy hand-rolled walker on the marker
// shapes legalese ships in production.
//
// Why this exists: Phase 2 will route traffic through the new
// substituter behind a flag; Phase 3 will flip the default; Phase 4
// will delete the old code. Each step depends on output parity, so
// catching a divergence here saves bisecting through downstream tests.

import { test, expect, describe } from 'bun:test';
import { substituteMarkers as legacySubstitute } from '@/md/substitute';
import { substituteMarkersViaMarkdsl } from '@/md/markdsl-substitute';
import type { Schema } from '@/md/types';

// — Shared schema/values for the suite —

const schema: Schema = {
  agreement:        { def: 'Landscaping Services Agreement' },
  customer:         {},
  contractor:       {},
  party:            { term: 'Party' },
  location:         { term: 'Location' },
  monthly_fee:      { term: 'Monthly Fee', required: true },
  publishers_share: { term: "Publisher's Share", def: 'a 50% share' },
  initial_term:     { term: 'Initial Term', def: 'an initial term of two (2) years' },
  company:          {},
};

const values = {
  customer:    "McDonald's USA, LLC",
  contractor:  'Greenline Landscaping, Inc.',
  monthly_fee: '$1,850.00',
  company:     'Spellcraft Inc.',
};

const opts = { schema, values };

function parity(body: string): void {
  expect(substituteMarkersViaMarkdsl(body, opts))
    .toBe(legacySubstitute(body, opts));
}

describe('markdsl substituter — output parity with legacy substitute', () => {
  test('plain text (no markers)', () => parity('Just a paragraph with no markers.'));

  test('introduce form: `{{$the_X}}` with both value and def composed', () => {
    parity('This {{$the_Agreement}} is binding.');
  });

  test('introduce form: only value (no def in schema)', () => {
    parity('between {{$the_Customer}} and {{$the_Contractor}}.');
  });

  test('introduce form: only def (no value)', () => {
    parity('Subject to {{$the_Publishers_share}}.');
  });

  test('introduce form: required + missing → BLANK with parens', () => {
    parity('Pay {{$the_Monthly_fee}}.');
  });

  test('introduce form: not-required + missing → inline-styled idiom', () => {
    parity('Each {{$a_Party}}, collectively {{$the_Parties}}.');
  });

  test('bare value: with value', () => parity('From {{=Customer}}.'));

  test('bare value: ALL CAPS', () => parity('OF {{=COMPANY}}'));

  test('bare value: missing → BLANK', () => parity('From {{=missing_key}}.'));

  test('plain reference: `{{key}}`', () => parity('the {{customer}} agrees.'));

  test('plain reference: `{{the_X}}`', () => parity('after {{the_Agreement}} expires.'));

  test('plain reference: capitalized article `{{The_X}}`', () => {
    parity('{{The_Customer}} signs first.');
  });

  test('plain reference: indefinite article auto-flips', () => {
    parity('such {{a_Agreement}} cannot be amended.');
  });

  test('literal inline `{{!Term}}`', () => parity('the {{!Services}} provided.'));

  test('literal define `{{Term}}` (capitalized, not in schema)', () => {
    parity('this {{Schedule}} controls.');
  });

  test('small caps `{{^WHEREAS}}`', () => parity('{{^WHEREAS}}, the parties...'));

  test('multi-line input with mixed marker forms', () => {
    parity([
      'This {{$the_Agreement}}, dated {{$the_Effective_date}}, is between',
      '{{$the_Customer}} and {{$the_Contractor}}, individually {{$a_Party}}',
      'and collectively {{$the_Parties}}.',
      '',
      'Pay {{$the_Monthly_fee}}.',
    ].join('\n'));
  });

  test('marker followed by sentence-end period (trailing-dot swallow)', () => {
    parity('Filed by {{=company}}. Today.');
    // Note: legacy collapses `Inc..` → `Inc.` directly during walk;
    // markdsl version does it post-pass. Both must produce the same
    // output here.
  });

  test('value with special characters (apostrophe, comma)', () => {
    parity("Acme says hi from {{=customer}}.");
  });

  test('ALL CAPS title-position substitution', () => {
    parity('RESOLUTIONS OF {{=COMPANY}}');
  });
});

describe('markdsl substituter — fallthroughs', () => {
  test('empty body returns empty', () => {
    expect(substituteMarkersViaMarkdsl('', opts)).toBe('');
  });

  test('body without any marker is unchanged', () => {
    const src = 'A normal paragraph with **markdown** but no markers.';
    expect(substituteMarkersViaMarkdsl(src, opts)).toBe(src);
  });
});
