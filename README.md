# Novel Browser Glass

Glasses-first novel reader for Meta Ray-Ban Display, built around ReadNovelFull search, chapter browsing, saved progress, and D-pad navigation in a 600 by 600 additive-display viewport.

## Highlights

- Search ReadNovelFull novels from a local proxy server and deduplicate noisy results.
- Open novel details, browse windowed chapter lists, and jump directly by chapter number.
- Read chapters with saved per-chapter progress, global resume, recent history, and per-favorite resume actions.
- Reader settings for text size, line spacing, comfort tone, and focus mode.
- Adjacent chapter prefetching for faster Prev/Next reading.
- Offline-friendly static shell for local UI assets.

## Local Preview

```bash
npm run dev
```

Open the printed local URL. The current default is `http://127.0.0.1:4200/`.

Controls:

- Arrow keys: move focus through visible controls.
- Enter: activate the focused control.
- Escape: go back.

## Verification

```bash
npm run verify
```

This runs static app checks, lightweight glasses benchmarks, and Node contract tests.

## Project Structure

```text
novel-browser/index.html       Glasses UI screens and app shell
novel-browser/styles.css       Additive-display theme, focus states, reader modes
novel-browser/app.js           Browser entrypoint and screen orchestration
novel-browser/src/config/      App constants and default state
novel-browser/src/features/    Testable feature rules such as reader settings and chapter jump
novel-browser/src/services/    Browser storage and persistence helpers
novel-browser/src/server/      Shared ReadNovelFull API/parser implementation
novel-browser/src/utils/       Text, URL label, escaping, and result-normalization helpers
novel-browser/sw.js            Offline static shell cache
api/                           Vercel serverless API routes
work/dev-server.mjs            Local static server and API preview
scripts/                       Static checks and benchmark checks
tests/                         Feature-level and regression tests
.github/workflows/quality.yml  Push and pull-request quality gate
.github/workflows/release-candidate.yml Manual release-candidate package gate
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for implementation choices, [TESTING.md](TESTING.md) for validation coverage, [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel release flow, [SECURITY.md](SECURITY.md) for network and content guardrails, [ROADMAP.md](ROADMAP.md) for future work, and [CHANGELOG.md](CHANGELOG.md) for project history.

## Portfolio Classification

This repository is intended to be published with the `portfolio-showcase`, `portfolio-wearable`, and `meta-rayban-display` topics. It demonstrates:

- a readable 600 by 600 glasses-first reader,
- D-pad and focus-based browsing,
- resilient local reading persistence,
- lightweight API proxying and source parsing,
- user-centric reading comfort controls.

Live production deployment: [novel-browser-glass.vercel.app](https://novel-browser-glass.vercel.app)
