/**
 * Inject a "View as Page" badge into a README file.
 * Idempotent — if the badge already exists, it updates the URL.
 */

import { readFileSync, writeFileSync } from 'node:fs';

/** Markers used to find/replace the badge block */
const BADGE_START = '<!-- readme-converter:badge:start -->';
const BADGE_END = '<!-- readme-converter:badge:end -->';

/**
 * Build the badge markdown block for a given page URL.
 */
function buildBadgeBlock(pageUrl) {
  const badge = `[![View as Page](https://img.shields.io/badge/📄_View_as_Page-blue?style=for-the-badge)](${pageUrl})`;
  return `${BADGE_START}\n${badge}\n${BADGE_END}`;
}

/**
 * Inject or update the badge in a markdown string.
 * Places it right after the first heading (h1), or at the very top if no h1.
 *
 * @param {string} markdown - The raw markdown content
 * @param {string} pageUrl  - The URL to the pretty page
 * @returns {string} Updated markdown
 */
export function injectBadge(markdown, pageUrl) {
  const badgeBlock = buildBadgeBlock(pageUrl);
  const existingRe = new RegExp(
    `${escapeRegex(BADGE_START)}[\\s\\S]*?${escapeRegex(BADGE_END)}`
  );

  // If badge already exists, update it in place
  if (existingRe.test(markdown)) {
    return markdown.replace(existingRe, badgeBlock);
  }

  // Otherwise insert after the first h1 line
  const h1Re = /^(#\s+.+)$/m;
  const h1Match = markdown.match(h1Re);

  if (h1Match) {
    const insertPos = h1Match.index + h1Match[0].length;
    return (
      markdown.slice(0, insertPos) +
      '\n\n' +
      badgeBlock +
      '\n' +
      markdown.slice(insertPos)
    );
  }

  // No h1 found — prepend
  return badgeBlock + '\n\n' + markdown;
}

/**
 * Read a file, inject the badge, write it back.
 *
 * @param {string} filePath - Path to the README
 * @param {string} pageUrl  - URL to the pretty page
 */
export function injectBadgeInFile(filePath, pageUrl) {
  const content = readFileSync(filePath, 'utf-8');
  const updated = injectBadge(content, pageUrl);
  writeFileSync(filePath, updated, 'utf-8');
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
