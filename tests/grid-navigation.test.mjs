import test from 'node:test';
import assert from 'node:assert/strict';

import { findNextGridIndex } from '../novel-browser/src/features/grid-navigation.js';

test('keypad left and right move one key at a time across rows', function() {
  assert.equal(findNextGridIndex(0, 29, 6, 'right'), 1);
  assert.equal(findNextGridIndex(1, 29, 6, 'left'), 0);
  assert.equal(findNextGridIndex(5, 29, 6, 'right'), 6);
  assert.equal(findNextGridIndex(6, 29, 6, 'left'), 5);
});

test('keypad up and down move by configured row width', function() {
  assert.equal(findNextGridIndex(0, 29, 6, 'down'), 6);
  assert.equal(findNextGridIndex(18, 29, 6, 'up'), 12);
});

test('grid navigation yields when movement leaves the grid', function() {
  assert.equal(findNextGridIndex(0, 29, 6, 'left'), -1);
  assert.equal(findNextGridIndex(28, 29, 6, 'right'), -1);
  assert.equal(findNextGridIndex(24, 29, 6, 'down'), -1);
});
