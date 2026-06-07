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
  assert.match(app, /applyReaderSettings/);
  assert.match(app, /setFocusMode/);
  assert.match(css, /#reader\.focus-mode/);
});

test('chapter navigation and resume features are wired', function() {
  assert.match(html, /go-chapter-jump/);
  assert.match(app, /findChapterIndexByNumber/);
  assert.match(app, /prefetchAdjacentChapters/);
  assert.match(app, /recentNovels/);
  assert.match(app, /resumeFavorite/);
});

test('offline shell is registered', function() {
  assert.match(html, /manifest\.webmanifest/);
  assert.match(app, /serviceWorker\.register/);
});
