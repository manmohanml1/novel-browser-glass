import test from 'node:test';
import assert from 'node:assert/strict';

import {
  adjustFontSize,
  adjustLineSpace,
  describeLineSpace,
  getReaderStyleVars,
  normalizeReaderSettings,
  toggleComfort
} from '../novel-browser/src/features/reader-settings.js';

test('normalizeReaderSettings clamps invalid values to glasses-safe ranges', function() {
  assert.deepEqual(normalizeReaderSettings({ fontSize: 99, lineSpace: -9, comfort: false }), {
    fontSize: 22,
    lineSpace: -1,
    comfort: false
  });

  assert.deepEqual(normalizeReaderSettings({ fontSize: 'bad', lineSpace: 'bad' }), {
    fontSize: 16,
    lineSpace: 0,
    comfort: true
  });
});

test('reader setting adjustments stay inside supported bounds', function() {
  assert.equal(adjustFontSize(22, 2), 22);
  assert.equal(adjustFontSize(14, -2), 14);
  assert.equal(adjustLineSpace(1, 1), 1);
  assert.equal(adjustLineSpace(-1, -1), -1);
});

test('reader settings produce labels and CSS variables for the app shell', function() {
  assert.equal(describeLineSpace(-1), 'Compact');
  assert.equal(describeLineSpace(0), 'Normal');
  assert.equal(describeLineSpace(1), 'Roomy');

  assert.deepEqual(getReaderStyleVars({ fontSize: 18, lineSpace: 1, comfort: false }), {
    fontSize: '18px',
    lineHeight: '1.72',
    gap: '16px',
    color: '#edf3ff'
  });
});

test('toggleComfort preserves normalized reader settings', function() {
  assert.deepEqual(toggleComfort({ fontSize: 18, lineSpace: 1, comfort: true }), {
    fontSize: 18,
    lineSpace: 1,
    comfort: false
  });
});
