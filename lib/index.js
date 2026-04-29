// Public surface for the doc-builder library. Import from here in user code:
//   import { build, h2, p, fieldTable } from './lib/index.js';

export { t, b, i, bi, dt } from './runs.js';
export { p, h1, h2, list, spacer, raw } from './blocks.js';
export { fieldTable } from './field-table.js';
export { signatureTable } from './signature-table.js';
export { gridTable } from './grid-table.js';
export { build } from './build.js';
export * as defaults from './defaults.js';
