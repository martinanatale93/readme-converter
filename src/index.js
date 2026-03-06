/**
 * Public API — use this module when importing readme-converter programmatically.
 *
 *   import { convert, convertFromGitHub } from 'readme-converter';
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { resolveOptions } from './config.js';
import { fetchReadme } from './fetcher.js';
import { parseMarkdown } from './parser.js';
import { render } from './renderer.js';

/**
 * Convert a local markdown file to a standalone HTML page.
 *
 * @param {string} inputPath  - Path to the .md file
 * @param {object} [opts]     - Override any DEFAULTS key
 * @returns {string} The generated HTML
 */
export function convert(inputPath, opts = {}) {
  const markdown = readFileSync(inputPath, 'utf-8');
  return convertString(markdown, opts);
}

/**
 * Convert a raw markdown string to a standalone HTML page.
 *
 * @param {string} markdown
 * @param {object} [opts]
 * @param {object} [stats]  - GitHub repo stats (optional)
 * @returns {string} The generated HTML
 */
export function convertString(markdown, opts = {}, stats = null) {
  const options = resolveOptions(opts);
  const { html, headings, hero } = parseMarkdown(markdown);
  return render({ html, headings, hero, options, stats });
}

/**
 * Fetch a README from GitHub and convert it.
 *
 * @param {string} repoRef - GitHub URL or owner/repo shorthand
 * @param {object} [opts]
 * @returns {Promise<string>} The generated HTML
 */
export async function convertFromGitHub(repoRef, opts = {}) {
  const { content, stats } = await fetchReadme(repoRef);
  return convertString(content, opts, stats);
}

/**
 * Convert and write the output to a file.
 *
 * @param {string} inputPath
 * @param {object} [opts]
 * @returns {string} The path that was written
 */
export function convertAndWrite(inputPath, opts = {}) {
  const options = resolveOptions(opts);
  const html = convert(inputPath, opts);
  mkdirSync(dirname(options.output), { recursive: true });
  writeFileSync(options.output, html, 'utf-8');
  return options.output;
}

export { DEFAULTS, resolveOptions } from './config.js';
export { parseGitHubUrl, fetchReadme, fetchRepoStats } from './fetcher.js';
export { parseMarkdown, buildToc } from './parser.js';
export { render } from './renderer.js';
export { injectBadge, injectBadgeInFile } from './badge.js';
