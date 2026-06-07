# Architecture

## Overview

Novel Browser Glass is a static vanilla JavaScript webapp served by a small local Node proxy. The browser UI stays dependency-free so it remains lightweight for Meta Ray-Ban Display. The local server handles ReadNovelFull access, parsing, and CORS-safe JSON APIs.

## Client

- `index.html` defines five primary screens: Home, Novel Detail, Chapter Picker, Reader, and Reader Settings.
- `styles.css` preserves the 600 by 600 additive-display contract with black page background, visible dark surfaces, and strong focus rings.
- `app.js` owns screen navigation, focus movement, local persistence, API calls, reader settings, favorites, recent history, and chapter progress.

## Server

`work/dev-server.mjs` serves static files and exposes:

- `/api/search?q=...` for ranked novel search.
- `/api/novel?url=...` for novel metadata and full chapter archive extraction.
- `/api/chapter?url=...` for direct chapter parsing with mirror fallback.

The server only accepts ReadNovelFull URLs and normalizes them to `http://readnovelfull.com/...`.

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
