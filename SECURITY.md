# Security And Content Guardrails

## Scope

The app is a local reading prototype. It does not authenticate users, collect personal data, or write to a remote database.

## Network Access

The local server only proxies `readnovelfull.com` URLs. URL normalization rejects other domains before fetching.

## Local Storage

Reader state is stored in browser `localStorage` only. It may include novel titles, chapter URLs, progress percentages, favorites, and reader settings. Clearing site data removes it.

## Third-Party Content

Novel metadata and chapters are parsed from ReadNovelFull pages. Treat that content as untrusted display data. The app escapes rendered text before injecting it into the UI.

## Deployment

No production deployment is included by default. If the app is published later, use HTTPS and review source-site terms, rate limits, and content availability before sharing publicly.
