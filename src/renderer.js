/**
 * Assemble the final HTML page from parsed content + options.
 * Reads the template and theme from disk, fills in placeholders.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildToc } from './parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(__dirname, '..', 'templates', 'page.html');
const THEME_PATH = join(__dirname, '..', 'themes', 'default.css');

/**
 * Read a file once and cache it (simple module-level cache).
 */
const fileCache = new Map();
function cachedRead(filepath) {
  if (!fileCache.has(filepath)) {
    fileCache.set(filepath, readFileSync(filepath, 'utf-8'));
  }
  return fileCache.get(filepath);
}

/**
 * Detect a page title from the first <h1> in the HTML body,
 * or use the hero title if one was extracted.
 */
function detectTitle(html, hero, fallback) {
  if (hero?.title) return hero.title;
  const match = html.match(/<h1[^>]*>(.*?)<\/h1>/s);
  return match ? match[1].replace(/<[^>]*>/g, '').trim() : fallback;
}

/**
 * Extract a short description from the hero or first <p>.
 */
function detectDescription(html, hero) {
  if (hero?.description) return hero.description;
  const match = html.match(/<p>(.*?)<\/p>/s);
  if (!match) return '';
  return match[1].replace(/<[^>]*>/g, '').trim().slice(0, 200);
}

/* ──────────────────── HTML fragments ──────────────────── */

const DARK_MODE_TOGGLE = `<button class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode">🌓</button>`;

const DARK_MODE_SCRIPT = `
<script>
(function () {
  var STORAGE_KEY = 'readme-converter-theme';
  var toggle = document.getElementById('themeToggle');
  var root = document.documentElement;

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    applyTheme(saved);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }
})();
</script>`;

/* ──────────────────── Feature builders ──────────────────── */

/**
 * Build the hero banner HTML.
 */
function buildHero(hero) {
  if (!hero) return '';
  const desc = hero.description
    ? `<p class="hero-description">${hero.description}</p>`
    : '';
  return `<header class="hero">\n<h1 class="hero-title">${hero.title}</h1>\n${desc}\n</header>`;
}

/**
 * Format a number with k/m suffixes for display.
 */
function formatCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

/**
 * Build the GitHub stats bar HTML.
 */
function buildStatsBar(stats) {
  if (!stats) return '';
  const items = [];

  items.push(
    `<a class="stat-item" href="${stats.url}/stargazers" target="_blank" rel="noopener">` +
      `<span class="stat-icon">⭐</span> <span class="stat-value">${formatCount(stats.stars)}</span> stars</a>`
  );

  items.push(
    `<a class="stat-item" href="${stats.url}/network/members" target="_blank" rel="noopener">` +
      `<span class="stat-icon">🍴</span> <span class="stat-value">${formatCount(stats.forks)}</span> forks</a>`
  );

  if (stats.license) {
    items.push(
      `<span class="stat-item"><span class="stat-icon">📄</span> ${stats.license}</span>`
    );
  }

  if (stats.language) {
    items.push(
      `<span class="stat-item"><span class="stat-icon">💻</span> ${stats.language}</span>`
    );
  }

  items.push(
    `<a class="stat-item" href="${stats.url}" target="_blank" rel="noopener">` +
      `<span class="stat-icon">🔗</span> View on GitHub</a>`
  );

  return `<div class="stats-bar">\n${items.join('\n')}\n</div>`;
}

/**
 * Build all interactive scripts (copy buttons, scroll animations, active TOC).
 * Combined into a single <script> block for efficiency.
 */
function buildInteractiveScripts(options) {
  const parts = [];

  if (options.copyButtons) {
    parts.push(`
  // ── Copy buttons on code blocks ──
  document.querySelectorAll('pre').forEach(function (pre) {
    var btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.addEventListener('click', function () {
      var code = pre.querySelector('code');
      var text = code ? code.textContent : pre.textContent;
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      });
    });
    pre.appendChild(btn);
  });`);
  }

  if (options.scrollAnimations) {
    parts.push(`
  // ── Scroll-reveal animations ──
  var revealEls = document.querySelectorAll(
    '.content h2, .content h3, .content p, .content pre, .content ul, .content ol, .content table, .content blockquote, .content img'
  );
  revealEls.forEach(function (el) { el.classList.add('reveal'); });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(function (el) { observer.observe(el); });`);
  }

  if (options.activeToc && options.toc) {
    parts.push(`
  // ── Active TOC highlighting ──
  var tocLinks = document.querySelectorAll('.toc a');
  var headingEls = [];
  tocLinks.forEach(function (link) {
    var id = link.getAttribute('href').slice(1);
    var heading = document.getElementById(id);
    if (heading) headingEls.push({ el: heading, link: link });
  });

  function updateActiveToc() {
    var scrollY = window.scrollY || window.pageYOffset;
    var active = null;
    for (var i = headingEls.length - 1; i >= 0; i--) {
      if (headingEls[i].el.offsetTop <= scrollY + 100) {
        active = headingEls[i];
        break;
      }
    }
    tocLinks.forEach(function (l) { l.classList.remove('active'); });
    if (active) active.link.classList.add('active');
  }

  window.addEventListener('scroll', updateActiveToc, { passive: true });
  updateActiveToc();`);
  }

  if (parts.length === 0) return '';
  return `<script>\n(function () {${parts.join('\n')}\n})();\n</script>`;
}

/* ──────────────────── Main render ──────────────────── */

/**
 * Render the final standalone HTML string.
 *
 * @param {object} params
 * @param {string} params.html       - The markdown-converted HTML body
 * @param {Array}  params.headings   - Headings extracted by the parser
 * @param {object} params.hero       - Extracted hero { title, description } or null
 * @param {object} params.options    - Resolved config options
 * @param {object} [params.stats]    - GitHub repo stats or null
 * @returns {string} Complete HTML page
 */
export function render({ html, headings, hero, options, stats = null }) {
  const template = cachedRead(TEMPLATE_PATH);
  let styles = cachedRead(THEME_PATH);

  // Inject accent colour into the CSS
  styles = styles.replaceAll('{{accentColor}}', options.accentColor);

  const title = detectTitle(html, hero, options.title);
  const description = detectDescription(html, hero);
  const tocHtml = options.toc ? buildToc(headings, options.tocDepth) : '';
  const heroHtml = options.hero ? buildHero(hero) : '';
  const statsHtml = options.stats ? buildStatsBar(stats) : '';

  const replacements = {
    '{{title}}': title,
    '{{description}}': description,
    '{{styles}}': styles,
    '{{body}}': html,
    '{{toc}}': tocHtml,
    '{{hero}}': heroHtml,
    '{{statsBar}}': statsHtml,
    '{{darkModeToggle}}': options.darkMode ? DARK_MODE_TOGGLE : '',
    '{{darkModeScript}}': options.darkMode ? DARK_MODE_SCRIPT : '',
    '{{interactiveScripts}}': buildInteractiveScripts(options),
  };

  let page = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    page = page.replaceAll(placeholder, value);
  }

  return page;
}
