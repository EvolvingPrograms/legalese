// Inline run helpers — return TextRun objects intended for use inside p().

import { TextRun } from 'docx';

/** @typedef {import('docx').TextRun} Run */
/** @typedef {string | Run} RunChild */

/** @param {string} text */
export const t  = (text) => new TextRun({ text });
/** @param {string} text */
export const b  = (text) => new TextRun({ text, bold: true });
/** @param {string} text */
export const i  = (text) => new TextRun({ text, italics: true });
/** @param {string} text */
export const bi = (text) => new TextRun({ text, bold: true, italics: true });

// dt('Term') -> ' (the *"Term"*)' as an array of runs. Leading space included so
// it reads naturally after a noun.
/** @param {string} term @returns {Run[]} */
export const dt = (term) => [t(' (the '), bi(`“${term}”`), t(')')];

/** @param {RunChild} child @returns {Run} */
export const asRun = (child) => (typeof child === 'string' ? t(child) : child);
