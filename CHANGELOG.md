# Changelog

## 0.2.2

- Added a primary Search key directly inside the on-screen keypad so front-page searches are reachable without navigating to the bottom bar.
- Replaced the duplicate Home bottom action bar with three launch actions: Search New, Resume, and Favorites.
- Moved Clear Results into the Results heading so clearing stays visible and contextual.
- Improved home focus behavior so returning to Home lands on the typing grid instead of miscellaneous shortcuts.
- Moved the reader card background onto the scroll surface so long chapters keep a consistent reading backdrop while scrolling.
- Focus the first search result automatically after successful searches to reduce D-pad travel.

## 0.2.1

- Fixed D-pad movement so arrow directions move spatially through keyboard rows and sections instead of stepping through every focusable character.
- Fixed desktop keypad Left/Right behavior with deterministic grid movement and added a sticky typed-query preview above the keypad.
- Increased default visual scale for the home screen, keyboard, cards, and navigation controls for better readability on Meta Ray-Ban Display.

## 0.2.0

- Added portfolio-style release governance with a source-of-truth release config, environment config, PR checklist, multi-environment CI, release-candidate packaging, and versioning docs.
- Added a small release/environment badge to the glasses app shell.
- Added release governance and environment regression tests.

## 0.1.0

- Built a Meta Ray-Ban Display-focused ReadNovelFull reader.
- Added search, deduped results, novel details, full chapter archives, chapter picker, and reader.
- Added favorites, global resume, per-favorite resume, recent history, and reader progress.
- Added reader settings, focus mode, chapter number jump, and adjacent chapter prefetch.
- Added static app shell service worker.
- Added portfolio-style documentation, tests, benchmarks, and GitHub quality workflow.
