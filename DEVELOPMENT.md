# Development and user distribution

## Repositories

- Development: `gitblogapp/vanilla-gitblog-template-dev` (this repository). Tests, fixture generators, lint tooling and publishing scripts live here.
- Distribution: `gitblogapp/vanilla-gitblog-template`. Public GitHub template; use this repository as the creation/update source when adding it to the GitBlog catalog. Its main branch is generated, not hand-edited.

`distribution/config.json` explicitly selects tracked runtime paths. `scripts/distribution/export.mjs` copies them, replaces README/AGENTS and the update workflow, prunes developer npm commands/dependencies, and refreshes the lockfile without lifecycle scripts. Untracked files, private environment files, development fixtures, tests, lint configuration and publisher credentials are excluded. Source Markdown example posts and symlinks are rejected. Keep `cheerio` in the user dependencies: the shared CLI discovery auditor imports it at runtime. Keep example content outside tracked template content.

`check` in a user blog checks actual authoring state, immutable IDs, taxonomy and Vanilla source. `update:check` also builds the site, audits discovery/Hub contracts and checks user-file preservation. No development `tests/` directory is needed. All authoring, translation, images, TTS, membership, history, registration, deployment and future template update capabilities remain included. User workflows never publish template releases.

## Pipeline

1. PR/main/dispatch in the development repository runs `release:check`: unit/contracts, authoring build, speech, memberships, translated SEO, extension integration, browser behavior and distribution/publisher tests.
2. `scripts/distribution/verify.mjs` exports tracked source into a fresh directory, archives the clean source, then runs a fresh install and user `update:check`. It removes the archive on failure. Only a successful job uploads the archive.
3. A separate publish job runs only on development `main` after verification. It downloads the artifact from that same run; a PR cannot publish or access the token.
4. The publisher clones the existing distribution repository, replaces its tracked files, commits the validated content, then records that content commit in `.gitblog/release.json` in a second commit. It atomically pushes main and a `<channel>/vX.Y.Z` tag, without force. Concurrent remote changes fail the push. The publish step rejects artifacts from another source revision and obsolete runs whose source commit is no longer development main.
5. Re-running the same source revision is idempotent. New source revisions automatically increment patch versions, with `minimumVersion` as a floor. `.gitblog/distribution.json` records the development source repository/revision for traceability; it is not an update baseline.

The two-commit structure avoids a self-referential commit SHA. GitBlog reads `release.json` at distribution main, then fetches its `revision` from the **distribution repository**, never the development repository. The catalog and GitHub template lineage must point to `gitblogapp/vanilla-gitblog-template`. The `.github/workflows/validate-update.yml` filename and update policy contract stay stable. Existing trusted OIDC registration/history workflow SHAs remain reachable: do not rewrite the distribution's Git history.

## Publishing credential

The source repository's `TEMPLATE_PUBLISH_TOKEN` Actions secret contains a fine-grained PAT with resource owner `gitblogapp`, access to **only** the three distribution repositories `astro-gitblog-template`, `react-gitblog-template` and `vanilla-gitblog-template`, and repository permissions **Contents: Read and write** and **Workflows: Read and write** (Metadata read is implicit). Workflows permission is needed because deployment/update workflows are part of the generated template. The configured token expires on **2026-11-29**; renew the three development repositories’ secrets before expiry. Svelte uses its own separate token. A future per-template token may be restricted to just its corresponding distribution repository. If the organization requires approval, the token must be approved before publishing.

The organization currently disables deploy keys. No key was added and no personal CLI credential is copied. The token is exposed only to the main-branch publish step; Git receives it through an ephemeral `GIT_ASKPASS` helper that contains no token literal and is removed at exit. URLs and commits never contain the credential. PR tests run without this secret.

Issue the token at https://github.com/settings/personal-access-tokens/new and save it at https://github.com/gitblogapp/vanilla-gitblog-template-dev/settings/secrets/actions. The user may instead run `gh secret set TEMPLATE_PUBLISH_TOKEN --repo gitblogapp/vanilla-gitblog-template-dev` and paste it into the hidden terminal prompt. Never send the token in chat or commit it. Restrict who can push to development main because that branch controls published user code.

## Local verification / recovery

```sh
npm ci
npm run release:check
node scripts/distribution/verify.mjs /tmp/vanilla-template-distribution.tar
```

`test:distribution` publishes twice to an isolated local bare Git repository to verify atomic history, stable revisions, version increments and idempotence. It never changes GitHub.

Fix failed source tests and push a new development commit. If only publishing failed, rerun the workflow. A successful atomic push followed by runner loss is safe to rerun. Roll back by reverting the development change and letting the pipeline publish a new patch; do not force-rewrite the template or reuse a released version. No existing user blogs are reset by this workflow.

## Stable 1.0 baseline

The `stable` release channel starts the current source at version `1.0.0`, tagged `stable/v1.0.0`. Existing unprefixed tags remain immutable historical releases. GitBlog creation and updates resolve `.gitblog/release.json` on main, whose numeric version remains standard semver. Subsequent source revisions increment the patch within this channel; rerunning a revision does not publish again. Package versions start at `1.0.0`; the release manifest is authoritative for subsequent template patch releases.
