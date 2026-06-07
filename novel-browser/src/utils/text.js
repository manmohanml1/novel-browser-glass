export function cleanWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function shortChapterSlug(url) {
  return String(url || '')
    .replace(/^https?:\/\/readnovelfull\.com\//i, '')
    .replace(/\.html(?:[?#].*)?$/i, '');
}

export function shortNovelSlug(url) {
  return shortChapterSlug(url);
}

export function normalizeResultKey(item) {
  var urlKey = String(item && item.url ? item.url : '')
    .replace(/^https?:\/\//i, '')
    .replace(/^readnovelfull\.com\//i, '')
    .replace(/\.html(?:[?#].*)?$/i, '')
    .replace(/\/+$/g, '')
    .toLowerCase();
  var titleKey = String(item && item.title ? item.title : '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return urlKey || titleKey;
}

export function normalizeResults(results) {
  var seen = {};
  return (results || []).filter(function(item) {
    var key = normalizeResultKey(item);
    if (!key || seen[key]) {
      return false;
    }
    seen[key] = true;
    return true;
  });
}
