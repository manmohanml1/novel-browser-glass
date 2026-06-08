import test from 'node:test';
import assert from 'node:assert/strict';

import { findNextSpatialItem } from '../novel-browser/src/features/spatial-navigation.js';

function keyGridItems(columns, count) {
  return Array.from({ length: count }, function(_, index) {
    return {
      left: (index % columns) * 48,
      top: Math.floor(index / columns) * 48,
      width: 40,
      height: 40
    };
  });
}

test('down moves spatially through keyboard rows instead of char by char', function() {
  var items = keyGridItems(6, 30);

  assert.equal(findNextSpatialItem(items, 0, 'down'), 6);
  assert.equal(findNextSpatialItem(items, 6, 'down'), 12);
  assert.equal(findNextSpatialItem(items, 12, 'down'), 18);
});

test('right and left still move to neighboring keys on the same row', function() {
  var items = keyGridItems(6, 30);

  assert.equal(findNextSpatialItem(items, 0, 'right'), 1);
  assert.equal(findNextSpatialItem(items, 1, 'left'), 0);
});

test('spatial navigation returns -1 when there is no item in that direction', function() {
  var items = keyGridItems(6, 30);

  assert.equal(findNextSpatialItem(items, 0, 'up'), -1);
  assert.equal(findNextSpatialItem(items, 29, 'down'), -1);
});
