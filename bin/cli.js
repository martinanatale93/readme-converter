#!/usr/bin/env node

/**
 * CLI entry point for readme-converter.
 *
 * Usage:
 *   readme-converter README.md                   # local file → index.html
 *   readme-converter README.md -o docs/page.html # custom output path
 *   readme-converter --repo owner/repo           # fetch from GitHub
 *   readme-converter --repo https://github.com/owner/repo
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Command } from 'commander';
import { convert, convertString, convertFromGitHub } from '../src/index.js';
import { DEFAULTS } from '../src/config.js';
import { injectBadgeInFile } from '../src/badge.js';

const program = new Command();

program
  .name('readme-converter')
  .description('Convert README.md files into beautiful static web pages')
  .version('1.0.0')
  .argument('[file]', 'Path to a local .md file')
  .option('-r, --repo <ref>', 'GitHub repo URL or owner/repo shorthand')
  .option('-o, --output <path>', 'Output file path', DEFAULTS.output)
  .option('-t, --title <title>', 'Page title (auto-detected from first h1 if omitted)')
  .option('--accent <color>', 'Accent colour (hex)', DEFAULTS.accentColor)
  .option('--no-toc', 'Disable table of contents')
  .option('--no-dark-mode', 'Disable dark mode toggle')
  .option('--no-hero', 'Disable hero banner')
  .option('--no-copy-buttons', 'Disable copy buttons on code blocks')
  .option('--no-scroll-animations', 'Disable scroll-reveal animations')
  .option('--no-active-toc', 'Disable active TOC highlighting')
  .option('--no-stats', 'Disable GitHub stats bar')
  .option('--toc-depth <n>', 'Max heading depth for TOC (1-6)', String(DEFAULTS.tocDepth))
  .option('--inject-badge <url>', 'Inject a "View as Page" badge into the source README linking to <url>')
  .action(async (file, opts) => {
    try {
      const options = {
        output: opts.output,
        accentColor: opts.accent,
        toc: opts.toc,
        darkMode: opts.darkMode,
        hero: opts.hero,
        copyButtons: opts.copyButtons,
        scrollAnimations: opts.scrollAnimations,
        activeToc: opts.activeToc,
        stats: opts.stats,
        tocDepth: Number(opts.tocDepth),
      };

      if (opts.title) {
        options.title = opts.title;
      }

      let html;

      if (opts.repo) {
        console.log(`Fetching README from ${opts.repo}…`);
        html = await convertFromGitHub(opts.repo, options);
      } else if (file) {
        const inputPath = resolve(file);
        if (!existsSync(inputPath)) {
          console.error(`Error: file not found — ${inputPath}`);
          process.exit(1);
        }
        html = convert(inputPath, options);
      } else {
        // Read from stdin
        const chunks = [];
        process.stdin.setEncoding('utf-8');
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        if (chunks.length === 0) {
          program.help();
          return;
        }
        html = convertString(chunks.join(''), options);
      }

      const outPath = resolve(options.output);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, html, 'utf-8');
      console.log(`✓ Written to ${outPath}`);

      // Optionally inject badge into the source README
      if (opts.injectBadge) {
        const readmePath = file ? resolve(file) : resolve('README.md');
        if (existsSync(readmePath)) {
          injectBadgeInFile(readmePath, opts.injectBadge);
          console.log(`✓ Badge injected into ${readmePath}`);
        }
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();
