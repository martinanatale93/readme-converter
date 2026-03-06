# readme-converter

Convert boring `README.md` files into beautiful, self-contained static web pages.

## Features

- **Zero-config** — one command, one polished page
- **Hero banner** — auto-extracts the title and intro into a gradient hero section
- **GitHub stats bar** — shows stars, forks, license and language when fetching from GitHub
- **Syntax highlighting** — powered by highlight.js with copy-to-clipboard buttons
- **Auto-generated TOC** — sticky sidebar with active section highlighting as you scroll
- **Scroll animations** — content fades in smoothly as you scroll down
- **Dark mode** — toggle with localStorage persistence + respects system preference
- **Fully self-contained** — single HTML file with inlined CSS/JS, no external dependencies
- **Customisable** — accent colour, TOC depth, and every feature toggleable on/off
- **Badge injection** — auto-injects a "View as Page" badge into your README
- **GitHub Action ready** — use it in CI/CD with README-change detection built in

## Installation

```bash
npm install -g readme-converter
```

Or use it locally in a project:

```bash
npm install readme-converter
```

## CLI Usage

```bash
# Convert a local file
readme-converter README.md

# Custom output path
readme-converter README.md -o docs/index.html

# Fetch from a GitHub repo (includes stats bar)
readme-converter --repo facebook/react

# Full GitHub URL with branch
readme-converter --repo https://github.com/facebook/react/tree/main

# Pipe from stdin
cat NOTES.md | readme-converter -o notes.html

# Customise
readme-converter README.md --accent "#e11d48" --no-toc --toc-depth 2

# Inject a "View as Page" badge into the source README
readme-converter README.md --inject-badge "https://mysite.github.io/my-repo"
```

### CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `[file]` | Path to a local `.md` file | — |
| `-r, --repo <ref>` | GitHub URL or `owner/repo` | — |
| `-o, --output <path>` | Output file path | `index.html` |
| `-t, --title <title>` | Page title | auto-detected |
| `--accent <color>` | Accent colour (hex) | `#2563eb` |
| `--no-toc` | Disable table of contents | — |
| `--no-dark-mode` | Disable dark mode toggle | — |
| `--no-hero` | Disable hero banner | — |
| `--no-stats` | Disable GitHub stats bar | — |
| `--no-copy-buttons` | Disable copy buttons on code blocks | — |
| `--no-scroll-animations` | Disable scroll-reveal animations | — |
| `--no-active-toc` | Disable active TOC highlighting | — |
| `--toc-depth <n>` | Max heading depth for TOC | `3` |
| `--inject-badge <url>` | Inject a "View as Page" badge into the README | — |

## Programmatic API

```js
import { convert, convertString, convertFromGitHub } from 'readme-converter';

// From a local file
const html = convert('./README.md');

// From a string
const html2 = convertString('# Hello\n\nWorld');

// From GitHub (includes stats bar automatically)
const html3 = await convertFromGitHub('facebook/react');

// With options
const html4 = convert('./README.md', {
  accentColor: '#e11d48',
  toc: false,
  darkMode: true,
  hero: true,
  copyButtons: true,
  scrollAnimations: true,
});

// Badge injection
import { injectBadgeInFile } from 'readme-converter';
injectBadgeInFile('./README.md', 'https://mysite.github.io/my-repo');
```

## GitHub Action

Copy the example workflow into any repo at `.github/workflows/readme-page.yml`.
A ready-to-use template is also available at [`examples/readme-page.yml`](examples/readme-page.yml).

```yaml
name: README Page

on:
  push:
    branches: [main]
    paths:
      - 'README.md'   # only runs when the README changes

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: martinanatale/readme-converter@v1
        with:
          file: README.md
          output: public/index.html
          # accent: '#2563eb'
          # inject-badge: 'true'       # on by default
          # skip-if-unchanged: 'true'  # skip if README wasn't modified

      - uses: actions/upload-pages-artifact@v3
        with:
          path: public/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deploy.outputs.page_url }}
    steps:
      - id: deploy
        uses: actions/deploy-pages@v4
```

### Action Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `file` | Path to the markdown file | `README.md` |
| `output` | Output HTML file path | `index.html` |
| `accent` | Accent colour (hex) | `#2563eb` |
| `toc` | Include table of contents | `true` |
| `dark-mode` | Include dark mode toggle | `true` |
| `toc-depth` | Max heading depth for TOC (1-6) | `3` |
| `inject-badge` | Inject a "View as Page" badge into the README | `true` |
| `page-url` | Custom URL for the badge (auto-detected if empty) | — |
| `skip-if-unchanged` | Skip if the README wasn't modified in this push | `false` |

### Using across accounts

The action works from **any** repo as long as `readme-converter` is public. Your work org repos can reference your personal account:

```yaml
- uses: martinanatale/readme-converter@v1
```

### Versioning

Create a tagged release for stability:

```bash
git tag v1.0.0 && git push --tags
```

Consumer repos reference `@v1` so patch updates don't break anything. A release workflow at `.github/workflows/release.yml` auto-creates GitHub Releases when you push a tag.

## Project Structure

```
readme-converter/
├── bin/cli.js                        # CLI entry point
├── src/
│   ├── config.js                     # Central config & defaults
│   ├── fetcher.js                    # GitHub README + stats fetcher
│   ├── parser.js                     # Markdown → HTML + TOC + hero extraction
│   ├── renderer.js                   # Template + theme + interactive features
│   ├── badge.js                      # Badge injection (idempotent)
│   └── index.js                      # Public API
├── templates/page.html               # HTML shell template
├── themes/default.css                # Default theme (light + dark)
├── examples/readme-page.yml          # Ready-to-copy workflow for consumers
├── .github/workflows/release.yml     # Auto-release on tag push
├── action.yml                        # GitHub Action definition
└── package.json
```

## Requirements

- Node.js >= 18

## License

MIT
