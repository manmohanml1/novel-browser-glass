import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const html = await readFile('novel-browser/index.html', 'utf8');
const css = await readFile('novel-browser/styles.css', 'utf8');
const app = await readFile('novel-browser/app.js', 'utf8');

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
  assert.match(html, /data-grid-columns="6"/);
  assert.match(app, /setupEnvironment/);
  assert.match(app, /renderReleaseBadge/);
  assert.match(app, /getVisibleFocusables/);
  assert.match(app, /findGridFocusIndex/);
  assert.match(app, /updateQueryPreview/);
  assert.match(app, /document\.activeElement\.readOnly/);
  assert.match(app, /applyReaderSettings/);
  assert.match(app, /setFocusMode/);
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
  assert.match(app, /serviceWorker\.register/);
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
