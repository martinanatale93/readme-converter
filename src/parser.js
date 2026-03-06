/**
 * Markdown → HTML conversion with syntax highlighting.
 * Also extracts headings for TOC generation.
 */

import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

/**
 * Build a configured Marked instance.
 * Kept as a factory so each call is side-effect free.
 */
function createMarked() {
  const headings = [];

  const marked = new Marked(
    markedHighlight({
      langPrefix: 'hljs language-',
      highlight(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
      },
    })
  );

  // Custom heading renderer to collect headings for the TOC
  const renderer = {
    heading({ tokens, depth }) {
      const text = tokens.map((t) => t.raw || t.text).join('');
      const id = slugify(text);
      headings.push({ id, text, depth });
      return `<h${depth} id="${id}">${marked.parseInline(text)}</h${depth}>`;
    },
  };

  marked.use({ renderer });

  return { marked, headings };
}

/**
 * Convert a heading string into a URL-friendly slug.
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')    // strip HTML tags
    .replace(/[^\w\s-]/g, '')   // strip special chars
    .replace(/\s+/g, '-')       // spaces → hyphens
    .replace(/-+/g, '-')        // collapse hyphens
    .replace(/^-|-$/g, '');     // trim leading/trailing
}

/**
 * Build a nested HTML table-of-contents from collected headings.
 */
export function buildToc(headings, maxDepth) {
  const filtered = headings.filter((h) => h.depth <= maxDepth);
  if (filtered.length === 0) return '';

  const items = filtered
    .map(
      (h) =>
        `<li class="toc-item toc-depth-${h.depth}">` +
        `<a href="#${h.id}">${h.text}</a></li>`
    )
    .join('\n');

  return `<nav class="toc" aria-label="Table of contents">\n<ul>\n${items}\n</ul>\n</nav>`;
}

/**
 * Parse markdown string → { html, headings, hero }.
 * When hero extraction is possible the first h1 and following paragraph
 * are returned separately so the renderer can place them in a banner.
 */
export function parseMarkdown(markdown) {
  const { marked, headings } = createMarked();
  const html = marked.parse(markdown);
  const hero = extractHero(html);
  return { html: hero ? hero.rest : html, headings, hero };
}

/**
 * Pull the first <h1> and immediately-following <p> out of the HTML.
 * Returns { title, description, rest } or null if no h1 is found.
 */
function extractHero(html) {
  const re = /(<h1[^>]*>(.*?)<\/h1>)\s*(<p>(.*?)<\/p>)?/s;
  const match = html.match(re);
  if (!match) return null;

  const title = match[2].replace(/<[^>]*>/g, '').trim();
  const description = match[4]
    ? match[4].replace(/<[^>]*>/g, '').trim()
    : '';

  // Remove the matched hero block from the body
  const rest = html.replace(match[0], '').trim();

  return { title, description, rest };
}
