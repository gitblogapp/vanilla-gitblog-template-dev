# Local verification

## Actual embed preview restored — 2026-10-28

The persistent ignored `.preview/site` now shows the real template audio player, the original `gitblog-giscus` Widget and styles, and the unmodified built `gitblog-related` renderer on all three example articles. Audio uses the existing Supertonic F1 voice sample; comments and recommendations use explicitly labeled local read-only fixtures. This verifies presentation, not authenticated production integration. Source template content remains empty.

Preview build/discovery validation passed. An isolated temporary browser fixture passed rendering on all three pages, audio play/pause/speed, byte ranges, dark-theme synchronization, iframe resizing, 320/390px widths, related links and write rejection. Manual LAN visual inspection was not repeated. Reproduction instructions are kept in `.preview/embeds/README.md`.

## Plain blog redesign — 2026-10-28

Simplified the presentation to a text header, white/neutral palette, unboxed introduction, thin article separators and a readable article layout. Removed decorative note artwork, numbered entries and the separate author navigation bar. The preview is maintained separately in `.preview/site`; source content stays empty.

## Journal redesign — 2026-10-28

Replaced the repository header, branch-style category control, README panel and language-distribution-like bar with compact journal navigation, a note-inspired introduction, numbered entries and a plain category list. Added an independent teal/warm-neutral palette and SVG notebook mark; syntax highlighting now uses local theme colors instead of the bundled GitHub theme.

Passed `test:browser`, `test:integration` and `update:check` (including check/build/SEO and owner-file preservation). Browser fixtures cover search, audio, themes and mobile navigation at 320/390px. A separate ignored `.preview/site` working copy contains three demonstration articles and thumbnails; the delivered content directory remains empty. The previous temporary preview was removed by the local environment, so its temporary audio/comment demonstration assets are not part of this recreated preview. Production integration code remains covered by the existing tests.

The LAN preview server listens on port 4177. Its address depends on the computer's current network interface. Manual visual inspection was not repeated after the earlier browser access denial.

## Initial template — 2026-10-26

Verified on 2026-10-26 using Node.js 24 and installed Chrome. Baseline: Svelte 1.14.4; shared packages 0.1.1. The delivered source contains no example articles.

| Check | Result |
| --- | --- |
| `npm run check` | Passed deployment, 38 harness checks, authoring/ID validation, JavaScript syntax and 6 renderer/contract tests |
| `npm run test:integration` | Passed root/project/custom-domain builds, extensions, translations, stale-output cleanup and empty blog |
| `npm run test:browser` | Passed Korean/English Pagefind, theme persistence, audio controls, 320/390px layouts, mobile dialog/focus/TOC and no-JS article reading |
| `npm run test:tts` | Passed DeepL/manual translation policies, supported-language selection, cache reuse and Python generator tests |
| Membership checks within `check` | Passed public previews, locked stubs, translated entries, embed markup, SEO and exclusion from full TTS |
| `npm run update:check` | Passed check/build/SEO and byte-preservation checks for owner files |
| `npm audit` | No reported vulnerabilities |
| Development watcher smoke | Passed first build, preview startup and rebuild after a public configuration edit |

The empty source build emits about 19.6 KB of minified browser JavaScript before transfer compression. This excludes optional Pagefind payloads and separately loaded third-party embeds.

The example preview is a separate temporary working copy. It contains three clearly labeled sample posts and thumbnails, actual Supertonic excerpt audio, and original GitBlog related/Giscus renderers with local demonstration data. It is not an authenticated production blog or a live service integration test.

Direct visual inspection of the LAN preview was unavailable because the browser origin approval gate denied access. Automated browser checks ran against their own temporary test fixtures. No remote repository, production deployment, catalog registration or live ingestion was performed in this task.
