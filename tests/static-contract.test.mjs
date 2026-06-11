import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const html = await readFile('novel-browser/index.html', 'utf8');
const css = await readFile('novel-browser/styles.css', 'utf8');
const app = await readFile('novel-browser/app.js', 'utf8');
const sw = await readFile('novel-browser/sw.js', 'utf8');

test('glasses viewport and D-pad contract are present', function() {
  assert.match(html, /width=600,\s*height=600/);
  assert.match(css, /\.focusable:focus/);
  assert.match(app, /ArrowUp/);
  assert.match(app, /ArrowDown/);
  assert.match(app, /Enter/);
  assert.match(app, /Escape/);
});

test('reader comfort features are wired', function() {
  assert.match(html, /reader-settings/);
  assert.match(html, /toggle-reader-focus/);
  assert.match(html, /release-badge/);
  assert.match(html, /query-preview/);
  assert.match(html, /class="text-input sr-only-input"/);
  assert.match(html, /data-grid-columns="6"/);
  assert.match(html, /data-action="focus-search"/);
  assert.match(html, /data-action="focus-favorites"/);
  assert.match(html, /hero-actions" data-grid-columns="3"/);
  assert.match(html, /nav-bar" data-grid-columns="4"[\s\S]*data-action="open-detail-current"/);
  assert.match(html, /nav-bar" data-grid-columns="4"[\s\S]*data-action="open-picker-current"/);
  assert.match(html, /nav-bar" data-grid-columns="6"[\s\S]*data-action="next-chapter"/);
  assert.match(html, /nav-bar" data-grid-columns="2"[\s\S]*data-action="toggle-reader-focus"/);
  assert.match(html, /key-primary[^>]+data-action="run-search"/);
  assert.match(html, /section-action focusable" data-action="clear-results"/);
  assert.doesNotMatch(html, /nav-item primary focusable" data-action="run-search"/);
  assert.match(app, /setupEnvironment/);
  assert.match(app, /renderReleaseBadge/);
  assert.match(app, /getVisibleFocusables/);
  assert.match(app, /function getHomeStartControl/);
  assert.match(app, /function focusSearchKeypad/);
  assert.match(app, /function focusFavoritesList/);
  assert.match(app, /function focusFirstResult/);
  assert.doesNotMatch(app, /search-input'\)\.value = state\.data\.recentQuery/);
  assert.match(app, /findGridFocusIndex/);
  assert.match(app, /findNextGridIndex/);
  assert.doesNotMatch(app, /\\.jump-grid, \\.setting-controls/);
  assert.match(app, /updateQueryPreview/);
  assert.match(app, /document\.activeElement\.readOnly/);
  assert.match(app, /applyReaderSettings/);
  assert.match(app, /setFocusMode/);
  assert.match(css, /\.text-input[\s\S]*color: transparent/);
  assert.match(css, /\.text-input[\s\S]*caret-color: transparent/);
  assert.match(css, /\.sr-only-input[\s\S]*position: absolute/);
  assert.match(css, /#reader\.focus-mode/);
});

test('chapter navigation and resume features are wired', function() {
  assert.match(html, /go-chapter-jump/);
  assert.match(app, /chapterJump\.resolveChapterJumpIndex/);
  assert.match(app, /prefetchAdjacentChapters/);
  assert.match(app, /recentNovels/);
  assert.match(app, /resumeFavorite/);
});

test('offline shell is registered', function() {
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /styles\.css\?v=0\.2\.2-ux-polish/);
  assert.match(html, /app\.js\?v=0\.2\.2-ux-polish/);
  assert.match(app, /serviceWorker\.register/);
  assert.match(sw, /novel-browser-glass-v0-2-2-ux-polish/);
  assert.match(sw, /fetch\(event\.request\)/);
  assert.match(sw, /cache\.put\(event\.request/);
});

test('reader D-pad scrolls text vertically and moves controls horizontally', function() {
  assert.match(app, /function scrollReader/);
  assert.match(app, /function moveReaderControlFocus/);
  assert.match(app, /preferredReaderAction/);
  assert.match(app, /loadChapter\(state\.currentChapter\.nextUrl, \{ preferredReaderAction: 'next-chapter' \}/);
  assert.match(app, /loadChapter\(state\.currentChapter\.prevUrl, \{ preferredReaderAction: 'prev-chapter' \}/);
  assert.match(app, /state\.currentScreen === 'reader'[\s\S]*scrollReader\('up'\)/);
  assert.match(app, /state\.currentScreen === 'reader'[\s\S]*scrollReader\('down'\)/);
  assert.match(app, /state\.currentScreen === 'reader'[\s\S]*moveReaderControlFocus\('left'\)/);
  assert.match(app, /state\.currentScreen === 'reader'[\s\S]*moveReaderControlFocus\('right'\)/);
  assert.match(app, /data-action="open-chapter-picker"/);
  assert.match(css, /\.reading-content[\s\S]*radial-gradient/);
  assert.match(css, /\.reading-content \.reader-panel[\s\S]*background: transparent/);
});

test('Vercel and modular source structure are present', async function() {
  const vercel = await readFile('vercel.json', 'utf8');
  const server = await readFile('novel-browser/src/server/readnovelfull.mjs', 'utf8');
  const jumpFeature = await readFile('novel-browser/src/features/chapter-jump.js', 'utf8');
  const readerFeature = await readFile('novel-browser/src/features/reader-settings.js', 'utf8');
  const searchApi = await readFile('api/search.js', 'utf8');

  assert.match(vercel, /novel-browser\/index\.html/);
  assert.match(searchApi, /handleApiRequest/);
  assert.match(server, /export async function searchNovels/);
  assert.match(server, /export function parseChapterHtml/);
  assert.match(jumpFeature, /export function resolveChapterJumpIndex/);
  assert.match(readerFeature, /export function getReaderStyleVars/);
});
