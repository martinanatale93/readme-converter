/**
 * Fetch a README from a GitHub repository URL.
 * Supports full repo URLs and owner/repo shorthand.
 */

import { DEFAULTS } from './config.js';

/**
 * Parse a GitHub URL or shorthand into { owner, repo, branch }.
 *
 * Accepted formats:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo/tree/branch
 *   owner/repo
 *   owner/repo#branch
 */
export function parseGitHubUrl(input) {
  // Full URL
  const urlRe = /github\.com\/([^/]+)\/([^/]+?)(?:\/tree\/([^/]+))?(?:\/|$)/;
  const urlMatch = input.match(urlRe);
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2].replace(/\.git$/, ''),
      branch: urlMatch[3] || null,
    };
  }

  // Shorthand: owner/repo or owner/repo#branch
  const shortRe = /^([^/]+)\/([^#]+?)(?:#(.+))?$/;
  const shortMatch = input.match(shortRe);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2].replace(/\.git$/, ''),
      branch: shortMatch[3] || null,
    };
  }

  throw new Error(
    `Unable to parse GitHub reference: "${input}". ` +
      'Use a full URL or owner/repo shorthand.'
  );
}

/**
 * Detect the default branch via the GitHub API (falls back to config default).
 */
async function detectDefaultBranch(owner, repo) {
  try {
    const res = await fetch(`${DEFAULTS.githubApiBase}/${owner}/${repo}`);
    if (!res.ok) return DEFAULTS.defaultBranch;
    const data = await res.json();
    return data.default_branch || DEFAULTS.defaultBranch;
  } catch {
    return DEFAULTS.defaultBranch;
  }
}

/**
 * Fetch GitHub repository stats (stars, forks, license, description).
 * Returns null on failure — stats are a nice-to-have, not critical.
 */
export async function fetchRepoStats(owner, repo) {
  try {
    const res = await fetch(`${DEFAULTS.githubApiBase}/${owner}/${repo}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      stars: data.stargazers_count ?? 0,
      forks: data.forks_count ?? 0,
      license: data.license?.spdx_id || null,
      description: data.description || '',
      language: data.language || null,
      openIssues: data.open_issues_count ?? 0,
      url: data.html_url,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch raw README content from a GitHub repository.
 * Tries common README file names in order.
 */
export async function fetchReadme(input) {
  const { owner, repo, branch: explicitBranch } = parseGitHubUrl(input);
  const branch = explicitBranch || (await detectDefaultBranch(owner, repo));

  const candidates = ['README.md', 'readme.md', 'Readme.md', 'README.MD'];

  for (const filename of candidates) {
    const url = `${DEFAULTS.githubRawBase}/${owner}/${repo}/${branch}/${filename}`;
    const res = await fetch(url);
    if (res.ok) {
      const stats = await fetchRepoStats(owner, repo);
      return {
        content: await res.text(),
        meta: { owner, repo, branch, filename, url },
        stats,
      };
    }
  }

  throw new Error(
    `No README found in ${owner}/${repo} (branch: ${branch}). Tried: ${candidates.join(', ')}`
  );
}
