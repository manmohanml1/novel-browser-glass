# Testing And Diagnostics

## Commands

Run the full local quality gate:

```bash
npm run verify
```

Run only static contract tests:

```bash
npm test
```

Run only the benchmark checks:

```bash
npm run benchmark
```

Start a local interactive preview:

```bash
npm run dev
```

## Automated Coverage

- 600 by 600 viewport and D-pad keyboard contract.
- Reader settings and focus mode wiring.
- Chapter number jump and chapter prefetch wiring.
- Recent history, favorites, and resume wiring.
- Offline shell registration.
- Static file presence, syntax checks, manifest icon, and glasses UI benchmarks.

## Manual Glasses-Focused Checks

1. Search `Shadow Slave`, open the result, and confirm the novel detail screen shows chapters.
2. Open Chapter 1 and confirm readable text appears.
3. Open Reader Settings, increase text size, and confirm the reader updates.
4. Toggle Focus Mode and confirm the reader chrome is reduced but Exit remains available.
5. Open Chapters, enter a chapter number, press Go, and confirm the picker moves near that chapter.
6. Favorite a novel, read part of a chapter, return Home, and confirm Favorites show Open plus Resume.
7. Reload the page and confirm Continue and Recent still restore local state.
