import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultData } from '../novel-browser/src/config/app-config.js';
import { loadStoredData, normalizeStoredData, saveStoredData } from '../novel-browser/src/services/storage.js';

function createMemoryStorage(initialValue) {
  const values = new Map(initialValue ? [['key', initialValue]] : []);
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    value(key) {
      return values.get(key);
    }
  };
}

test('normalizes missing collections and reader preferences', function() {
  const data = normalizeStoredData({
    readerSettings: { fontSize: 99, lineSpace: -9, comfort: false },
    favorites: 'bad'
  });

  assert.deepEqual(data.favorites, []);
  assert.equal(data.readerSettings.fontSize, 22);
  assert.equal(data.readerSettings.lineSpace, -1);
  assert.equal(data.readerSettings.comfort, false);
  assert.deepEqual(data.recentNovels, []);
});

test('loads valid persisted data over defaults', function() {
  const storage = createMemoryStorage(JSON.stringify({
    recentQuery: 'shadow slave',
    readerSettings: { fontSize: 18 }
  }));

  const data = loadStoredData('key', createDefaultData(), storage);

  assert.equal(data.recentQuery, 'shadow slave');
  assert.equal(data.readerSettings.fontSize, 18);
  assert.equal(data.readerSettings.comfort, true);
});

test('falls back safely when persisted data is corrupt', function() {
  const storage = createMemoryStorage('{bad');
  const data = loadStoredData('key', createDefaultData(), storage);

  assert.equal(data.readerSettings.fontSize, 16);
  assert.deepEqual(data.favorites, []);
});

test('saves normalized data', function() {
  const storage = createMemoryStorage();
  const saved = saveStoredData('key', { readerSettings: { fontSize: 9 } }, storage);
  const data = JSON.parse(storage.value('key'));

  assert.equal(saved, true);
  assert.equal(data.readerSettings.fontSize, 14);
});
