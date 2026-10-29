# Vanilla template adapter

The baseline is recorded in [.gitblog/template-standard.json](../../.gitblog/template-standard.json). Shared packages own authoring, IDs, translation policy, membership stubs, speech validation, crawler policy, deployment preparation, image optimization and browser integration protocols. Vanilla owns rendering and presentation.

| Command            | Implementation                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `dev`              | Full static build, source/content watcher, preview server; refresh after rebuilding                |
| `build:site`       | Node.js HTML generation and esbuild JS/CSS bundling in `scripts/build.mjs`; output `build/`        |
| `check:site`       | JavaScript syntax checks and renderer contract tests                                               |
| `test:integration` | Root/project/custom-domain builds, translations, stale output cleanup, empty blog and preservation |
| `search:index`     | Pagefind over published articles; skip an empty corpus                                             |
| `preview`          | Static server with base path, explicit 404 and Markdown MIME                                       |

## Rendering boundary

`src/lib/template/content.js` reads owner Markdown and applies the shared policies. HTML, feeds, sitemap, search, public Markdown and discovery all use this published corpus. Translation timestamps update SEO lastmod. Membership source files contain only the approved preview or an empty public stub; never private full text.

`page-data.js` selects public rendering fields. `document.js` combines `src/theme/layout.html` with the plain JavaScript renderer and serializes a smaller browser configuration. It does not serialize article bodies, arbitrary frontmatter, environment objects, drafts, private content or source paths. Text and attributes are escaped, and JSON is safe inside script elements. Owner Markdown and extension HTML are trusted site code.

`src/client.js` enhances existing HTML through DOM APIs. There is no framework, JSX, TypeScript, virtual DOM, hydration or client-side router. esbuild is a build-only tool that resolves shared npm/CSS imports and produces compact hashed assets. Comments, recommendations and membership mount their original clients.

The source locale is at `/`, translations at `/{locale}/`, and articles at `/blog/{slug}/`. The project base from `PUBLIC_SITE_URL` is included exactly once. Build output does not include that base directory. Every build cleans stale generated output. Pagefind indexes only `data-pagefind-body` and locale/category/tag filters.

## Theme and extensions

`src/theme/` contains the HTML shell, JavaScript renderer, SVG icons, copy, CSS and browser behavior. Theme variables expose aliases required by existing GitBlog embeds. Audio keeps native controls without JavaScript and enhances them with a compact accessible player.

`src/extensions/slots.js` exports `renderSlot(context)` returning HTML for `article-before-body`, `article-after-body` and `site-footer`. Context contains `name`, `site`, `locale`, `pathname` and optional `post`. Escape interpolated text with `html()` from `src/lib/template/html.js`. `src/extensions/client.js` exports `mountExtensions(data)` for browser behavior and receives the small public browser configuration.

An optional HTML fragment `src/pages/about.html` generates `/about/` with the same header, sidebar and footer. Its first H1 becomes the document title; canonical metadata uses its own URL. Core routes and locale names are reserved. Use relative or deployment-base-aware URLs and the browser extension for interactions.

## Verification and publishing

Run `npm run check`, `npm run test:integration`, `npm run test:browser` and `npm run update:check`. Tests create temporary articles, translations and audio fixtures. `update:check` verifies that builds leave owner files unchanged. Live provider authorization and GitBlog ingestion must be checked independently on a configured deployed blog.

Both hosting workflows are retained, including translation, blog-only TTS, CNAME/origin handling and discovery verification. Official GitBlog registration requires the real template repository and service catalog support; it remains opt-in. See [platform integration](platform-integration.md) and [preservation](customization.md).

## Development and user repositories

Development-only commands (`test:*`) and browser/SEO fixtures live in [the development repository](https://github.com/gitblogapp/vanilla-gitblog-template-dev). User distributions retain framework checks, authoring validation and `update:check` with source preservation, without tests. See the development repository’s `DEVELOPMENT.md` for the verified release pipeline.
