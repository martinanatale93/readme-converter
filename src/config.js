/**
 * Central configuration — all tunables live here.
 * Override via CLI flags or programmatic options.
 */

export const DEFAULTS = Object.freeze({
  /** Title used in the HTML <title> when none is detected */
  title: 'README',

  /** Accent colour applied to links, headings, etc. */
  accentColor: '#2563eb',

  /** Whether to include a dark-mode toggle */
  darkMode: true,

  /** Whether to generate a table-of-contents sidebar */
  toc: true,

  /** Output file name */
  output: 'index.html',

  /** GitHub raw content base URL */
  githubRawBase: 'https://raw.githubusercontent.com',

  /** GitHub API base URL */
  githubApiBase: 'https://api.github.com/repos',

  /** Default branch to fetch when none is specified */
  defaultBranch: 'main',

  /** Max heading depth to include in the TOC (h1–h?) */
  tocDepth: 3,

  /** Whether to extract h1 + first paragraph into a hero banner */
  hero: true,

  /** Whether to show a GitHub stats bar (stars, forks, license) */
  stats: true,

  /** Whether to add copy buttons to code blocks */
  copyButtons: true,

  /** Whether to enable scroll-reveal animations */
  scrollAnimations: true,

  /** Whether to highlight the active TOC item on scroll */
  activeToc: true,
});

/**
 * Merge user-supplied options with defaults.
 * Only keys present in DEFAULTS are kept.
 */
export function resolveOptions(userOpts = {}) {
  const merged = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    if (userOpts[key] !== undefined) {
      merged[key] = userOpts[key];
    }
  }
  return Object.freeze(merged);
}
