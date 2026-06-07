import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanWhitespace,
  escapeHtml,
  normalizeResultKey,
  normalizeResults,
  shortNovelSlug
} from '../novel-browser/src/utils/text.js';

test('cleanWhitespace prepares typed search input consistently', function() {
  assert.equal(cleanWhitespace('  the   sword\n god  '), 'the sword god');
});

test('escapeHtml protects rendered result titles', function() {
  assert.equal(escapeHtml('<Sword & God>'), '&lt;Sword &amp; God&gt;');
});

test('normalizeResults removes duplicate novels across repeated search payloads', function() {
  const results = normalizeResults([
    { title: 'The Sword God', url: 'https://readnovelfull.com/the-sword-god.html' },
    { title: 'The Sword God', url: 'https://readnovelfull.com/the-sword-god.html?utm=old' },
    { title: 'The Sword God of the Universe', url: 'https://readnovelfull.com/the-sword-god-of-the-universe.html' },
    { title: 'The Sword God', url: '' },
    { title: 'The Sword God', url: '' }
  ]);

  assert.equal(results.length, 3);
  assert.equal(results[0].title, 'The Sword God');
  assert.equal(results[1].title, 'The Sword God of the Universe');
  assert.equal(results[2].url, '');
});

test('normalizeResultKey and shortNovelSlug produce stable labels', function() {
  assert.equal(normalizeResultKey({ title: 'Ignored', url: 'https://readnovelfull.com/novel-name.html?x=1' }), 'novel-name');
  assert.equal(shortNovelSlug('https://readnovelfull.com/novel-name.html'), 'novel-name');
});
