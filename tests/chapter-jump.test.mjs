import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendDigit,
  findChapterIndexByNumber,
  resolveChapterJumpIndex
} from '../novel-browser/src/features/chapter-jump.js';

test('appendDigit keeps chapter jump short and strips leading zeroes', function() {
  assert.equal(appendDigit('', '0'), '0');
  assert.equal(appendDigit('0', '7'), '7');
  assert.equal(appendDigit('12345', '6'), '12345');
});

test('findChapterIndexByNumber matches explicit chapter titles', function() {
  const chapters = [
    { title: 'Prologue' },
    { title: 'Chapter 12 - The Door' },
    { title: 'Chapter 13 - The Gate' }
  ];

  assert.equal(findChapterIndexByNumber(chapters, 12), 1);
  assert.equal(findChapterIndexByNumber(chapters, 99), -1);
});

test('resolveChapterJumpIndex falls back to 1-based position', function() {
  const chapters = [
    { title: 'Opening' },
    { title: 'Second step' },
    { title: 'Chapter 10 - Later' }
  ];

  assert.equal(resolveChapterJumpIndex(chapters, 10), 2);
  assert.equal(resolveChapterJumpIndex(chapters, 2), 1);
  assert.equal(resolveChapterJumpIndex(chapters, 99), 2);
  assert.equal(resolveChapterJumpIndex([], 1), -1);
});
