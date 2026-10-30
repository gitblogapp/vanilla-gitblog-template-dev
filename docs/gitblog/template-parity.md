# Svelte 1.14.4 parity

Updated on 2026-10-26 against `gitblogapp/svelte-gitblog-template` 1.14.4,
source revision `8e341bac3096731e14891a867bb16ab20ba70fd6`.
The framework-neutral npm packages remain pinned to `0.1.1`; no package version change is needed.

| Capability         | Vanilla implementation                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blog speech        | Enabled in new-template `.env.production`; source post switches/voices propagate to supported DeepL/manual translations. Full audio remains in the owner's repository.          |
| Article audio UI   | Compact localized player above the body; play/pause, seek, time, 0.75–2× custom menu, keyboard/outside-click dismissal, theme colors, error recovery and native no-JS fallback. |
| Platform speech    | Only `gitblogapp/gitblog-tts` consumes the central queue. No platform runner is shipped here.                                                                                   |
| Membership         | Public stub and preview policy, independent reader with Vanilla theme tokens and back-navigation preservation, private body excluded from public output and template TTS.       |
| Images             | Shared build-output optimization, source preservation and duplicate-encoding avoidance.                                                                                         |
| Hosting            | User-owned GitHub/Cloudflare Pages, origin redirects, credential isolation and hosting-aware registration code.                                                                 |
| History operations | Pinned official worker caller, gated on official integration and server-authorized operations. No local history worker or automatic rewriting.                                  |
| Discovery          | Canonicals, reciprocal language links, robots/AI policies, Markdown, llms, RSS and translated feeds; base-aware web manifest using the shared GitBlog book icon.                            |
| CI                 | Authoring/build/preservation checks plus explicit membership and translated speech coverage.                                                                                    |

## Intentional Vanilla differences

Plain JavaScript static generation and a plain, reading-focused GitBlog theme replace the framework renderer. The browser uses DOM APIs with no framework or hydration runtime. Posts, categories, tags and translations start empty. DeepL is the default authoring mode; source locale defaults to English with no translation targets. Site copy is configured in `.env.production`, with `content/site.json` as fallback. Language selection uses a dropdown from two languages. Integrations use the original GitBlog clients and shared packages.

This local directory has no Git remote, so it has no independent release commit or deployed
blog identity. `.gitblog/template-standard.json` records the upstream baseline; a fake
`.gitblog/release.json` pointing at the Svelte repository would be incorrect.

Official GitBlog feed registration remains opt-in, using the server-approved Svelte reusable
workflow pin. Copying a registration script here does not change that remote runner's lineage
checks. Publishing a Vanilla template requires its real repository/catalog entry and coordinated
registration service support; see [platform integration](platform-integration.md).

## Validation

Run `npm run check`, `npm run test:integration`, `npm run test:tts`,
`npm run test:memberships`, `npm run test:browser` and `npm run update:check`.
Fixtures create temporary posts; the shipped template receives no example articles.
`update:check` verifies that the build does not mutate content, configuration, theme or extensions.
