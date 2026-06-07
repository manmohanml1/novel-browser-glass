import { createDefaultData } from '../config/app-config.js';

export function normalizeStoredData(data) {
  const defaults = createDefaultData();
  const next = Object.assign({}, defaults, data || {});
  next.favorites = Array.isArray(next.favorites) ? next.favorites : [];
  next.progressByChapter = next.progressByChapter && typeof next.progressByChapter === 'object'
    ? next.progressByChapter
    : {};
  next.readerSettings = Object.assign({}, defaults.readerSettings, next.readerSettings || {});
  next.readerSettings.fontSize = clampNumber(next.readerSettings.fontSize, 14, 22, defaults.readerSettings.fontSize);
  next.readerSettings.lineSpace = clampNumber(next.readerSettings.lineSpace, -1, 1, defaults.readerSettings.lineSpace);
  next.readerSettings.comfort = next.readerSettings.comfort !== false;
  next.recentNovels = Array.isArray(next.recentNovels) ? next.recentNovels : [];
  return next;
}

export function loadStoredData(storageKey, fallbackData, storage = window.localStorage) {
  try {
    const saved = storage.getItem(storageKey);
    if (!saved) {
      return normalizeStoredData(fallbackData);
    }
    return normalizeStoredData(Object.assign({}, fallbackData || {}, JSON.parse(saved)));
  } catch (error) {
    console.error('[Storage] Load failed', error);
    return normalizeStoredData(fallbackData);
  }
}

export function saveStoredData(storageKey, data, storage = window.localStorage) {
  try {
    storage.setItem(storageKey, JSON.stringify(normalizeStoredData(data)));
    return true;
  } catch (error) {
    console.error('[Storage] Save failed', error);
    return false;
  }
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numeric));
}
