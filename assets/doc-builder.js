// doc-builder.js
// Helpers and defaults for legal-style .docx documents.
// Everything routes through build({ title, output, body, ... }).
//
// Run helpers (return TextRun):  t, b, i, bi, dt
// Block helpers (return Paragraph or array):  p, h1, h2, list, spacer, raw
// Table helpers (return Table):  fieldTable, signatureTable, gridTable
// Build:  build({ title, output, body })

const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
  LevelFormat, Table, TableRow, TableCell, BorderStyle, WidthType,
  VerticalAlign, HeightRule, ShadingType,
} = require('docx');

// ----- Defaults (edit if a project needs different look) -----
const FONT = 'Times New Roman';
const BODY_SIZE = 24;          // half-points: 24 = 12pt
const H1_SIZE = 28;
const H2_SIZE = 24;
const PAGE = { width: 12240, height: 15840 };               // US Letter, DXA
const MARGIN = { top: 1440, right: 1440, bottom: 1440, left: 1440 };  // 1"
const TABLE_WIDTH = 9360;       // content width = page - margins
const PARA_SPACING = { before: 120, after: 120, line: 360 };           // 1.5
const LIST_SPACING = { before: 60, after: 60, line: 360 };
const SIG_TALL = 1200;          // signature row height (DXA)
const SUBLIST_REF = 'sublist';

const CELL_BORDER = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const FULL_BORDERS = {
  top: CELL_BORDER, bottom: CELL_BORDER,
  left: CELL_BORDER, right: CELL_BORDER,
};
const TABLE_BORDERS = {
  ...FULL_BORDERS,
  insideHorizontal: CELL_BORDER, insideVertical: CELL_BORDER,
};
const CELL_MARGINS = { top: 100, bottom: 100, left: 140, right: 140 };
const HEADER_SHADING = { fill: 'EEEEEE', type: ShadingType.CLEAR };

// ----- Run helpers -----
const t  = (text) => new TextRun({ text });
const b  = (text) => new TextRun({ text, bold: true });
const i  = (text) => new TextRun({ text, italics: true });
const bi = (text) => new TextRun({ text, bold: true, italics: true });

// dt('Term') returns the array of runs for ' (the *"Term"*)' — use inside p().
// Includes a leading space so it reads naturally after a noun.
const dt = (term) => [t(' (the '), bi(`\u201C${term}\u201D`), t(')')];

const _asRun = (child) => (typeof child === 'string' ? t(child) : child);

// ----- Block helpers -----

// p(...children) — justified body paragraph with default 1.5 spacing.
// Children may be strings, TextRuns, or arrays of either (dt() returns an array).
const p = (...children) => new Paragraph({
  spacing: PARA_SPACING,
  alignment: AlignmentType.JUSTIFIED,
  children: children.flat().map(_asRun),
});

// h1(text) — centered title heading. Pass { pageBreak: true } to start a new page.
const h1 = (text, opts = {}) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  pageBreakBefore: !!opts.pageBreak,
  children: [t(text)],
});

// h2(text) — section heading. Pass { pageBreak: true } for a new page.
const h2 = (text, opts = {}) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  pageBreakBefore: !!opts.pageBreak,
  children: [t(text)],
});

// list(...items) — lowercase lettered sublist (a), (b), (c)...
// Each item is a string OR an array of children (mix of strings/runs).
// Returns an array of Paragraphs; build() flattens automatically.
const list = (...items) => items.map((item) => {
  const children = (Array.isArray(item) ? item : [item]).flat().map(_asRun);
  return new Paragraph({
    numbering: { reference: SUBLIST_REF, level: 0 },
    spacing: LIST_SPACING,
    children,
  });
});

// spacer() — a blank line for vertical breathing room.
const spacer = () => new Paragraph({
  spacing: { before: 80, after: 80 },
  children: [t('')],
});

// raw(paragraph) — escape hatch: pass a docx Paragraph or Table you built yourself.
// Useful when you need formatting the helpers don't cover (numbered lists with custom
// numbering, complex multi-style runs, etc).
const raw = (node) => node;

// ----- Table internals -----
const _cell = (children, width, opts = {}) => {
  const cellOpts = {
    borders: FULL_BORDERS,
    width: { size: width, type: WidthType.DXA },
    margins: CELL_MARGINS,
    verticalAlign: VerticalAlign.CENTER,
    children,
  };
  if (opts.header) cellOpts.shading = HEADER_SHADING;
  if (opts.columnSpan) cellOpts.columnSpan = opts.columnSpan;
  return new TableCell(cellOpts);
};

// Resolve a `values` lookup by key, returning '' if missing/null.
const _val = (values, key) =>
  (key && values && values[key] != null) ? String(values[key]) : '';

// ----- fieldTable(values, rows) -----
// Two-column "Label | Value" table with full grid borders.
// rows: each row is either:
//   ['Label', 'key']                       — shorthand
//   ['Label', 'key', { prefix, subLabel }] — with options
//   { label, key, prefix, subLabel }       — object form
// `prefix` is text prepended to the value (e.g. '$ ' for a money cell).
// `subLabel` adds a small italic hint under the label.
const fieldTable = (values, rows) => {
  const LABEL_W = 2800;
  const VALUE_W = TABLE_WIDTH - LABEL_W;

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [LABEL_W, VALUE_W],
    borders: TABLE_BORDERS,
    rows: rows.map((row) => {
      let label, key, prefix, subLabel;
      if (Array.isArray(row)) {
        [label, key] = row;
        const opts = row[2] || {};
        prefix = opts.prefix; subLabel = opts.subLabel;
      } else {
        ({ label, key, prefix, subLabel } = row);
      }
      const filled = _val(values, key);
      const cellText = (prefix || '') + filled;
      const labelChildren = [
        new Paragraph({ children: [b(label)] }),
        ...(subLabel ? [new Paragraph({
          spacing: { before: 40 },
          children: [new TextRun({ text: subLabel, italics: true, size: 20 })],
        })] : []),
      ];
      return new TableRow({
        cantSplit: true,
        children: [
          _cell(labelChildren, LABEL_W),
          _cell([new Paragraph({ children: [t(cellText)] })], VALUE_W),
        ],
      });
    }),
  });
};

// ----- signatureTable(values, { left, right }) -----
// Four-column block with merged header cells per side.
// Each side: { header: 'WRITER', rows: [['Label', 'key', { tall: true }?], ...] }
// `tall: true` on either side makes that whole row taller (for handwritten signatures).
// The two sides are padded to equal length with blank rows.
const signatureTable = (values, { left, right }) => {
  const LABEL_W = 1500;
  const VALUE_W = 3180;

  const sigVal = (key) => _cell(
    [new Paragraph({ children: [t(_val(values, key))] })],
    VALUE_W,
  );

  const _normRow = (row) => {
    const [label = '', key = null, opts = {}] = row;
    return { label, key, opts };
  };

  const maxRows = Math.max(left.rows.length, right.rows.length);
  const pad = (rows) => {
    const out = rows.slice();
    while (out.length < maxRows) out.push(['', null]);
    return out.map(_normRow);
  };
  const lrows = pad(left.rows);
  const rrows = pad(right.rows);

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [LABEL_W, VALUE_W, LABEL_W, VALUE_W],
    borders: TABLE_BORDERS,
    rows: [
      // Merged headers
      new TableRow({
        cantSplit: true,
        children: [
          _cell(
            [new Paragraph({ alignment: AlignmentType.CENTER, children: [b(left.header)] })],
            LABEL_W + VALUE_W, { columnSpan: 2 },
          ),
          _cell(
            [new Paragraph({ alignment: AlignmentType.CENTER, children: [b(right.header)] })],
            LABEL_W + VALUE_W, { columnSpan: 2 },
          ),
        ],
      }),
      // Body rows
      ...lrows.map((L, idx) => {
        const R = rrows[idx];
        const tall = L.opts.tall || R.opts.tall;
        return new TableRow({
          cantSplit: true,
          ...(tall ? { height: { value: SIG_TALL, rule: HeightRule.ATLEAST } } : {}),
          children: [
            _cell([new Paragraph({ children: [b(L.label)] })], LABEL_W),
            sigVal(L.key),
            _cell([new Paragraph({ children: [b(R.label)] })], LABEL_W),
            sigVal(R.key),
          ],
        });
      }),
    ],
  });
};

// ----- gridTable({ columns, rows }) -----
// Generic data table with a shaded header row.
// columns: [{ label, key, width }]
//   label = header text, key = field key in row objects, width = relative DXA.
//   key === '#' renders 1-indexed row numbers.
// rows: array of objects keyed by column.key. Use {} for an empty row (for hand-fill).
// Column widths are scaled to fill TABLE_WIDTH.
const gridTable = ({ columns, rows }) => {
  const totalW = columns.reduce((s, c) => s + c.width, 0);
  const factor = TABLE_WIDTH / totalW;
  const widths = columns.map((c) => Math.round(c.width * factor));
  // Absorb rounding into the last column.
  widths[widths.length - 1] =
    TABLE_WIDTH - widths.slice(0, -1).reduce((s, w) => s + w, 0);

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    borders: TABLE_BORDERS,
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: columns.map((col, idx) =>
          _cell(
            [new Paragraph({ children: [b(col.label)] })],
            widths[idx],
            { header: true },
          ),
        ),
      }),
      ...rows.map((row, rowIdx) => new TableRow({
        cantSplit: true,
        children: columns.map((col, colIdx) => {
          let cellText = '';
          if (col.key === '#') cellText = String(rowIdx + 1);
          else if (row[col.key] != null) cellText = String(row[col.key]);
          return _cell(
            [new Paragraph({ children: [t(cellText)] })],
            widths[colIdx],
          );
        }),
      })),
    ],
  });
};

// ----- build({ title, output, body }) -----
// Writes a .docx to `output` and returns a Promise resolving to the path.
// `body` is an array of Paragraph/Table/raw-value entries (nested arrays OK).
// If `title` is provided, it renders as a centered Heading 1 at the top.
const build = ({ title, output, body }) => {
  const doc = new Document({
    styles: {
      default: { document: { run: { font: FONT, size: BODY_SIZE } } },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1',
          basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: H1_SIZE, bold: true, font: FONT },
          paragraph: {
            spacing: { before: 240, after: 360 },
            outlineLevel: 0,
            alignment: AlignmentType.CENTER,
          },
        },
        {
          id: 'Heading2', name: 'Heading 2',
          basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: H2_SIZE, bold: true, font: FONT },
          paragraph: {
            spacing: { before: 280, after: 120 },
            outlineLevel: 1,
            keepNext: true,
          },
        },
      ],
    },
    numbering: {
      config: [{
        reference: SUBLIST_REF,
        levels: [{
          level: 0,
          format: LevelFormat.LOWER_LETTER,
          text: '(%1)',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
    sections: [{
      properties: { page: { size: PAGE, margin: MARGIN } },
      children: [
        ...(title ? [h1(title)] : []),
        ...body.flat(Infinity),  // list() returns arrays — flatten everything
      ],
    }],
  });

  return Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(output, buffer);
    return output;
  });
};

module.exports = {
  // Run helpers
  t, b, i, bi, dt,
  // Block helpers
  p, h1, h2, list, spacer, raw,
  // Table helpers
  fieldTable, signatureTable, gridTable,
  // Build
  build,
  // Defaults exposed for advanced overrides
  defaults: {
    FONT, BODY_SIZE, H1_SIZE, H2_SIZE, PAGE, MARGIN, TABLE_WIDTH,
    PARA_SPACING, LIST_SPACING, SIG_TALL,
    CELL_BORDER, FULL_BORDERS, TABLE_BORDERS, CELL_MARGINS, HEADER_SHADING,
  },
};
