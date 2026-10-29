# Vanilla GitBlog Template — Development

Source and regression tests for the Vanilla GitBlog template. This repository produces a clean, empty blog template after all release checks pass.

- **Create a blog:** use [`gitblogapp/vanilla-gitblog-template`](https://github.com/gitblogapp/vanilla-gitblog-template), the user distribution.
- **Develop the template:** work here, in [`gitblogapp/vanilla-gitblog-template-dev`](https://github.com/gitblogapp/vanilla-gitblog-template-dev).
- **Release architecture and credential setup:** [DEVELOPMENT.md](DEVELOPMENT.md).
- **Blog setup and features:** [getting started](docs/gitblog/getting-started.md) and [official guides](docs/gitblog/README.md).
- **Agent entry point:** [AGENTS.md](AGENTS.md).

## Develop and verify

Use Node.js 24.12 or later, npm and Python 3.11 or later.

```sh
npm ci
npx playwright install chromium
PLAYWRIGHT_CHANNEL=chromium npm run release:check
node scripts/distribution/verify.mjs /tmp/vanilla-template-distribution.tar
```

The release suite checks authoring, deployment contracts, translations, static SEO, integrations, speech metadata, browser behavior and the distribution publisher. A fresh install and build of the exported user template must also succeed. Tests create temporary content; example posts and local preview data are never published.

## Automatic user releases

Pushes to `main` run `.github/workflows/release-template.yml`. Pull requests run the same verification without publishing. A successful main run publishes its verified artifact to `gitblogapp/vanilla-gitblog-template` and creates the next version tag. Failed or obsolete runs cannot update the user template. See [DEVELOPMENT.md](DEVELOPMENT.md) for recovery and the required `TEMPLATE_PUBLISH_TOKEN` secret.

`distribution/config.json` selects the exported runtime files. User blogs include authoring, translation, deployment, TTS, image optimization, comments, related posts, membership embeds and update validation. Development tests, fixtures, browser testing dependencies and publishing credentials are excluded.

## Owner-editable README

The user template receives [distribution/README.md](distribution/README.md) as its root README. Blog owners may rewrite or remove it. `.gitblog/update-policy.json` preserves both `README.md` and `.gitblog/user-instructions.md` during GitBlog updates; the LLM harness reads official instructions from `AGENTS.md` and `docs/gitblog/` instead. This development README is never copied over a blog owner's introduction.
