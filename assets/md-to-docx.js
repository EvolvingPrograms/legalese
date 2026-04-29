// md-to-docx.js
// Convert a markdown document with custom fenced blocks into a .docx,
// using pandoc as the markdown parser and the doc-builder.js helpers as
// the output stage. Pandoc gives us:
//   - fancy_lists      (a. b. c. lettered lists work natively)
//   - smart            (curly quotes, en/em dashes, ellipses)
//   - bracketed_spans  (room to grow for inline classes)
//
// Markdown features supported:
//   # Heading                   -> h1
//   ## Heading                  -> h2
//   ## Heading {.pageBreak}     -> h2 starting a new page
//   **bold** *italic* ***bi***  -> formatted runs
//   "quoted" 'apostrophes'      -> smart quotes (auto)
//   -- and ---                  -> en dash / em dash (auto)
//   {{Term}}                    -> defined term: ' (the *"Term"*)'
//   1. 2. 3.  OR  a. b. c.      -> lettered sublist (a) (b) (c)
//   ```fields ... ```           -> fieldTable block
//   ```sig ... ```              -> signatureTable block
//   ```grid ... ```             -> gridTable block

const fs = require('fs');
const { execSync } = require('child_process');
const yaml = require('js-yaml');
const { TextRun, Paragraph, HeadingLevel } = require('docx');
const {
  build, h1, h2, p, list, spacer,
  fieldTable, signatureTable, gridTable,
} = require('./doc-builder');

// ===== Front matter =====
function splitFrontMatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: src };
  return { meta: yaml.load(m[1]) || {}, body: m[2] };
}

// ===== Pandoc =====
function runPandoc(body) {
  const out = execSync(
    'pandoc --from=markdown+fancy_lists+smart+bracketed_spans -t json',
    { input: body, encoding: 'utf8' },
  );
  return JSON.parse(out);
}

// ===== Inline conversion =====
// Only set bold/italic when true so heading-style bold isn't overridden.
function makeRun(text, bold, italic) {
  const opts = { text };
  if (bold) opts.bold = true;
  if (italic) opts.italics = true;
  return new TextRun(opts);
}

// Scan plain text for {{Term}} markers, emitting defined-term runs.
function emitText(text, bold, italic, out) {
  const re = /\{\{([^}]+)\}\}/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push(makeRun(text.slice(last, m.index), bold, italic));
    }
    out.push(makeRun('(the ', bold, italic));
    out.push(makeRun(`\u201C${m[1].trim()}\u201D`, true, true));
    out.push(makeRun(')', bold, italic));
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push(makeRun(text.slice(last), bold, italic));
  }
}

function inlinesToRuns(inlines, opts = {}) {
  const { bold = false, italic = false } = opts;
  const out = [];
  for (const node of inlines) {
    switch (node.t) {
      case 'Str':
        emitText(node.c, bold, italic, out);
        break;
      case 'Space':
      case 'SoftBreak':
      case 'LineBreak':
        out.push(makeRun(' ', bold, italic));
        break;
      case 'Strong':
        out.push(...inlinesToRuns(node.c, { bold: true, italic }));
        break;
      case 'Emph':
        out.push(...inlinesToRuns(node.c, { bold, italic: true }));
        break;
      case 'Underline':
        out.push(...inlinesToRuns(node.c, { bold, italic: true }));
        break;
      case 'Strikeout':
        out.push(...inlinesToRuns(node.c, opts));
        break;
      case 'Quoted': {
        const [quoteType, contents] = node.c;
        const open = quoteType.t === 'DoubleQuote' ? '\u201C' : '\u2018';
        const close = quoteType.t === 'DoubleQuote' ? '\u201D' : '\u2019';
        out.push(makeRun(open, bold, italic));
        out.push(...inlinesToRuns(contents, { bold, italic }));
        out.push(makeRun(close, bold, italic));
        break;
      }
      case 'Code': {
        const [, text] = node.c;
        out.push(makeRun(text, bold, italic));
        break;
      }
      case 'Span': {
        const contents = node.c[1];
        out.push(...inlinesToRuns(contents, opts));
        break;
      }
      // Note, Cite, Image, Link, RawInline, Math: ignored.
    }
  }
  return out;
}

// ===== Block conversion =====
function blockToDocBuilder(blk, values) {
  switch (blk.t) {
    case 'Header': {
      const [level, attrs, inlines] = blk.c;
      const [, classes] = attrs;
      const pageBreak = classes.includes('pageBreak') || classes.includes('pagebreak');
      const runs = inlinesToRuns(inlines);
      const headingLevel = level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2;
      return [new Paragraph({
        heading: headingLevel,
        pageBreakBefore: pageBreak,
        children: runs,
      })];
    }

    case 'Para':
    case 'Plain':
      return [p(...inlinesToRuns(blk.c))];

    case 'OrderedList':
    case 'BulletList': {
      const items = blk.t === 'OrderedList' ? blk.c[1] : blk.c;
      const itemsAsRuns = items.map(itemBlocks => {
        const allInlines = [];
        for (const b of itemBlocks) {
          if (b.t === 'Plain' || b.t === 'Para') allInlines.push(...b.c);
        }
        return inlinesToRuns(allInlines);
      });
      return list(...itemsAsRuns);
    }

    case 'CodeBlock': {
      const [attrs, content] = blk.c;
      const [, classes] = attrs;
      const lang = classes[0];
      if (lang === 'fields') return [parseFieldsBlock(content, values)];
      if (lang === 'sig')    return [parseSigBlock(content, values)];
      if (lang === 'grid')   return [parseGridBlock(content)];
      console.warn('Unknown fenced block:', lang);
      return [];
    }

    case 'HorizontalRule':
      return [spacer()];

    // Unhandled / quietly skipped:
    case 'BlockQuote':
    case 'DefinitionList':
    case 'Table':
    case 'Div':
    case 'RawBlock':
    case 'Null':
      return [];

    default:
      console.warn('Unhandled block type:', blk.t);
      return [];
  }
}

// ===== Fenced block parsers =====

function parseFieldsBlock(content, values) {
  const rows = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const parts = line.split('|').map(s => s.trim());
    const label = parts[0];
    const key = parts[1] || null;
    const opts = {};
    for (const extra of parts.slice(2)) {
      const m = extra.match(/^(\w+)=(.*)$/);
      if (!m) continue;
      if (m[1] === 'prefix') opts.prefix = m[2];
      else if (m[1] === 'sub') opts.subLabel = m[2];
    }
    return [label, key, opts];
  });
  return fieldTable(values, rows);
}

function parseSigBlock(content, values) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return spacer();
  const splitSide = (sideText) => {
    const parts = sideText.split('|').map(s => s.trim());
    if (parts.length === 0 || (parts.length === 1 && !parts[0])) return ['', null];
    let label = parts[0];
    const key = parts[1] && parts[1] !== '_' ? parts[1] : null;
    const opts = {};
    const tallMatch = label.match(/^(.*?)\s*\[tall\]\s*$/);
    if (tallMatch) { label = tallMatch[1]; opts.tall = true; }
    return [label, key, opts];
  };
  const [leftHeader, rightHeader] = lines[0].split('||').map(s => s.trim());
  const leftRows = [], rightRows = [];
  for (const line of lines.slice(1)) {
    const [lside = '', rside = ''] = line.split('||').map(s => s);
    leftRows.push(splitSide(lside));
    rightRows.push(splitSide(rside));
  }
  return signatureTable(values, {
    left: { header: leftHeader, rows: leftRows },
    right: { header: rightHeader, rows: rightRows },
  });
}

function parseGridBlock(content) {
  const cfg = yaml.load(content) || {};
  const columns = cfg.columns || [];
  let rows = cfg.rows || [];
  if (cfg.empty_rows && !cfg.rows) {
    rows = Array.from({ length: cfg.empty_rows }, () => ({}));
  }
  return gridTable({ columns, rows });
}

// ===== Top-level =====
function convertMarkdown(srcText) {
  const { meta, body } = splitFrontMatter(srcText);
  const ast = runPandoc(body);
  const values = meta.values || {};
  const docBody = ast.blocks.flatMap(blk => blockToDocBuilder(blk, values));
  return build({
    title: meta.title,
    output: meta.output,
    body: docBody,
  });
}

if (require.main === module) {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error('Usage: node md-to-docx.js <input.md>');
    process.exit(1);
  }
  const src = fs.readFileSync(inputFile, 'utf8');
  convertMarkdown(src).then(out => {
    console.log('Wrote', out);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { convertMarkdown };
