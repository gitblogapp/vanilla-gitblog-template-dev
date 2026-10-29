# Vanilla GitBlog Template

A plain, reading-focused GitBlog template built with plain HTML, JavaScript and CSS. Node.js generates complete static pages; the browser adds search, theme switching, navigation, audio controls and GitBlog integrations. There is no frontend framework or hydration runtime. The template follows the Svelte GitBlog contracts through `@gitblogapp/core`, `@gitblogapp/cli` and `@gitblogapp/browser`, and starts with **no example posts**.

## Start locally

Requires Node.js **24.12 or newer** and npm.

```sh
npm ci
npm run dev -- --host 0.0.0.0 --port 4177
```

Open `http://localhost:4177/`, or your computer's LAN address on another device on the same network. The watcher rebuilds after edits; refresh when it reports completion. For a one-time build, run `npm run build`, then `npm run preview -- --port 4177`.

## Configure and write

Edit `.env.production` for public site identity, canonical URL, source and translation languages, hosting and integrations. Never put API tokens or private membership text in this file or the repository. `content/site.json` supplies legacy fallback copy; explicit environment settings take precedence.

```sh
npm run author:context
npm run author:new -- my-first-post --title "My first post" --description "A short summary" --date "2026-10-26T10:00:00+09:00"
npm run author:status
npm run author:check
npm run build
```

Source articles live in `content/posts/`. Follow the generated frontmatter and [authoring guide](../../docs/gitblog/authoring.md) for stable IDs, publication, translations and validation. DeepL is the default mode; the initial source language is English with no translation targets. Use `.gitblog/authoring.json` to select manual translation. Human and LLM authors start with [AGENTS.md](../../AGENTS.md); personal preferences belong in `.gitblog/user-instructions.md`.

## Features

- A simple text header, unboxed introduction, article summaries with thumbnails, category filters and a compact blog sidebar. Neutral colors, thin separators and readable typography keep the focus on writing.
- Responsive layouts, SVG icons, light/dark themes, collapsible mobile navigation and article tables of contents.
- Complete article HTML before JavaScript, canonical/hreflang links, structured metadata, RSS, sitemap, robots policies, public Markdown and `llms.txt`.
- Static Pagefind search with language/category filters, stable post identities, taxonomy aliases and CMS-compatible Markdown.
- Supertonic 3 blog TTS, enabled by default, with per-post voice/enable overrides and an accessible compact player. Supported translations receive speech too. Full audio stays in the owner's repository, outside the Pages artifact. Platform speech is handled separately by `gitblog-tts`.
- Original GitBlog Giscus, related-post and membership clients. Public membership previews follow shared policy; full private content comes from the authenticated membership service.
- Shared build-output image optimization that preserves source files and avoids repeated encoding of unchanged images.
- GitHub Pages and Cloudflare Pages workflows in the owner's accounts, including canonical-domain handling and verification.

Integrations need real service configuration. Official ingestion requires a published template catalog entry and server approval; this local template does not grant those automatically. See [platform integration](../../docs/gitblog/platform-integration.md).

## Customize

| File                       | Responsibility                                          |
| -------------------------- | ------------------------------------------------------- |
| `src/theme/layout.html`    | HTML document shell and insertion points                |
| `src/theme/render.js`      | Header, home, article, search and footer markup         |
| `src/theme/global.css`     | Layout, typography and light/dark tokens                |
| `src/theme/audio.css`      | Audio player styling                                    |
| `src/theme/icons.js`       | SVG icons; no platform emoji glyphs                     |
| `src/theme/client.js`      | Navigation, search and theme behavior                   |
| `src/extensions/slots.js`  | Owner markup before/after articles and after the footer |
| `src/extensions/client.js` | Owner browser enhancements                              |
| `src/pages/*.html`         | Optional fragments: `about.html` → `/about/`            |
| `src/lib/template/`        | Shared-policy adapters and public output contracts      |
| `scripts/build.mjs`        | Static rendering and esbuild browser JS/CSS bundling    |

Custom pages are HTML fragments without a second `<html>` or `<body>`. Their first H1 supplies the page title. Use relative or deployment-base-aware URLs. Slots receive public context and return HTML; escape interpolated values with `html()` from `src/lib/template/html.js`. Owner HTML/Markdown is trusted site source, not an untrusted visitor upload system. Theme, content, extensions and this README are owner files; follow [preservation rules](../../docs/gitblog/customization.md).

## Deploy

Set `GITBLOG_DEPLOY_PROVIDER=github` or `cloudflare` in `.env.production`. Both publish `build/`. Follow the [deployment guide](../../docs/gitblog/deployment.md) for setup, Actions variables/secrets and domains. Cloudflare API tokens and the optional DeepL key belong in Actions Secrets. Local static rendering needs no Cloudflare secret.

## Validate

```sh
npm run check
npm run test:integration
npm run test:tts
npm run test:memberships
npm run test:browser
npm run update:check
```

Browser checks use installed Chrome by default. Otherwise run `npx playwright install chromium` and `PLAYWRIGHT_CHANNEL=chromium npm run test:browser`. Tests create temporary content without adding posts to the template. Live authorization and ingestion require separate verification after deployment.

See the [documentation index](../../docs/gitblog/README.md), [adapter guide](../../docs/gitblog/template-porting.md) and [Svelte parity notes](../../docs/gitblog/template-parity.md).
