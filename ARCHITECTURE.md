# Architecture

## Overview

Novel Browser Glass is a static vanilla JavaScript webapp served by a small local Node proxy. The browser UI stays dependency-free so it remains lightweight for Meta Ray-Ban Display. The local server handles ReadNovelFull access, parsing, and CORS-safe JSON APIs.

## Client

- `index.html` defines five primary screens: Home, Novel Detail, Chapter Picker, Reader, and Reader Settings.
- `styles.css` preserves the 600 by 600 additive-display contract with black page background, visible dark surfaces, and strong focus rings.
- `app.js` owns screen orchestration, focus movement, and browser event handling.
- `src/config/` keeps app constants and default persisted state.
- `src/config/release.js` is the source of truth for the visible app version badge.
- `src/config/environment.js` resolves local, staging, and production behavior for CI and previews.
- `src/features/` keeps feature-level logic that can be tested independently, including chapter jump resolution and reader setting rules.
- `src/services/` keeps local storage and persistence helpers.
- `src/utils/` keeps text, URL label, HTML escaping, and search-result normalization helpers.

## Server

`src/server/readnovelfull.mjs` owns ReadNovelFull URL normalization, search ranking, metadata parsing, archive parsing, and chapter parsing.

`work/dev-server.mjs` serves static files locally and forwards API requests to the shared server module. `api/` contains Vercel serverless route wrappers for the same shared module:

- `/api/search?q=...` for ranked novel search.
- `/api/novel?url=...` for novel metadata and full chapter archive extraction.
- `/api/chapter?url=...` for direct chapter parsing with mirror fallback.

The API only accepts ReadNovelFull URLs and normalizes them to `http://readnovelfull.com/...`.

## Persistence

Local browser storage keeps:

- recent query,
- global last novel/chapter,
- favorites with optional per-favorite resume data,
- per-chapter scroll progress,
- reader settings,
- recent novel history.

No account, server database, or shared cloud state is used.

## Performance Choices

- Vanilla JavaScript only.
- Windowed chapter rendering instead of thousands of DOM buttons.
- Silent prefetch of previous and next chapter after a chapter opens.
- Service worker caches only static shell assets; API responses stay controlled by the app cache.

## Glasses Interaction Model

All important actions are focusable and reachable by arrows plus Enter. Escape navigates back. Home controls are exposed on deep screens to avoid trapping the user in a long history chain.
