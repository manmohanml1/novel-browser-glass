import { CONFIG, createDefaultData } from './src/config/app-config.js';
import { setupEnvironment } from './src/config/environment.js';
import { formatReleaseBadge, release } from './src/config/release.js';
import * as chapterJump from './src/features/chapter-jump.js';
import { findNextGridIndex } from './src/features/grid-navigation.js';
import * as readerPreferences from './src/features/reader-settings.js';
import { findNextSpatialItem } from './src/features/spatial-navigation.js';
import { loadStoredData, normalizeStoredData as normalizePersistedData, saveStoredData } from './src/services/storage.js';
import * as textUtils from './src/utils/text.js';

(function() {
  'use strict';

  var state = {
    currentScreen: 'home',
    screenHistory: [],
    isLoading: false,
    error: null,
    cache: {},
    lastRequest: null,
    searchRequestId: 0,
    searchingQuery: '',
    resultsCleared: false,
    data: createDefaultData(),
    results: [],
    currentNovel: null,
    currentChapter: null,
    detailChapterIndex: 0,
    pickerIndex: 0,
    preferredReaderAction: '',
    chapterJumpValue: '',
    focusMode: false,
    restoringProgress: false
  };

  var screens = {};

  function collectScreens() {
    document.querySelectorAll('.screen').forEach(function(screen) {
      if (screen.id) {
        screens[screen.id] = screen;
      }
    });
  }

  function navigateTo(screenId, options) {
    options = options || {};
    var addToHistory = options.addToHistory !== false;

    if (addToHistory && state.currentScreen) {
      state.screenHistory.push(state.currentScreen);
    }

    Object.keys(screens).forEach(function(id) {
      screens[id].classList.add('hidden');
    });

    if (screens[screenId]) {
      screens[screenId].classList.remove('hidden');
      state.currentScreen = screenId;
      onScreenEnter(screenId);
      focusFirst(screens[screenId]);
    }
  }

  function navigateBack() {
    if (state.screenHistory.length > 0) {
      navigateTo(state.screenHistory.pop(), { addToHistory: false });
      return;
    }
    if (state.currentScreen !== 'home') {
      navigateTo('home', { addToHistory: false });
    }
  }

  function goHome() {
    state.screenHistory = [];
    navigateTo('home', { addToHistory: false });
  }

  function focusFirst(container) {
    if (container && container.id === 'home') {
      var homeControl = getHomeStartControl();
      if (homeControl) {
        homeControl.focus();
        homeControl.scrollIntoView({ block: 'nearest' });
        return;
      }
    }

    if (container && container.id === 'reader') {
      var preferredAction = state.preferredReaderAction || 'open-chapter-picker';
      var readerControl = container.querySelector('.nav-bar .focusable[data-action="' + preferredAction + '"]') ||
        container.querySelector('.nav-bar .focusable[data-action="open-chapter-picker"]');
      if (readerControl) {
        readerControl.focus();
        return;
      }
    }

    var el = getVisibleFocusables(container)[0];
    if (el) {
      el.focus();
    }
  }

  function getHomeStartControl() {
    if (state.data && state.data.lastNovel && state.data.lastNovel.url) {
      return document.querySelector('.hero-actions .focusable[data-action="resume-last"]');
    }
    return document.querySelector('.hero-actions .focusable[data-action="focus-search"]');
  }

  function getVisibleFocusables(container) {
    return Array.from(
      container.querySelectorAll('.focusable:not([disabled]):not(.hidden)')
    ).filter(function(element) {
      return element.getClientRects().length > 0;
    });
  }

  function moveFocus(direction) {
    var container = screens[state.currentScreen];
    if (!container) {
      return;
    }

    var focusables = getVisibleFocusables(container);

    if (!focusables.length) {
      return;
    }

    var current = document.activeElement;
    var index = focusables.indexOf(current);

    if (index === -1) {
      focusFirst(container);
      return;
    }

    var nextIndex = findGridFocusIndex(focusables, index, direction);
    if (nextIndex === -1) {
      nextIndex = findNextSpatialFocusIndex(focusables, index, direction);
    }
    if (nextIndex === -1) {
      if (direction === 'up' || direction === 'left') {
        nextIndex = index > 0 ? index - 1 : focusables.length - 1;
      } else {
        nextIndex = index < focusables.length - 1 ? index + 1 : 0;
      }
    }

    focusables[nextIndex].focus();
    focusables[nextIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function findGridFocusIndex(focusables, currentIndex, direction) {
    var current = focusables[currentIndex];
    var grid = current.closest('[data-grid-columns], .number-grid, .setting-controls');
    if (!grid) {
      return -1;
    }

    var gridItems = Array.from(grid.querySelectorAll('.focusable:not([disabled]):not(.hidden)'))
      .filter(function(element) {
        return element.getClientRects().length > 0;
      });
    var gridIndex = gridItems.indexOf(current);
    if (gridIndex === -1) {
      return -1;
    }

    var columns = Number(grid.dataset.gridColumns || 0) || getGridColumnCount(grid);
    var targetGridIndex = findNextGridIndex(gridIndex, gridItems.length, columns, direction);
    if (targetGridIndex === -1) {
      return -1;
    }

    return focusables.indexOf(gridItems[targetGridIndex]);
  }

  function getGridColumnCount(grid) {
    if (grid.classList.contains('number-grid')) {
      return 3;
    }
    if (grid.classList.contains('setting-controls')) {
      return 2;
    }
    return 6;
  }

  function findNextSpatialFocusIndex(focusables, currentIndex, direction) {
    return findNextSpatialItem(focusables.map(function(element) {
      var rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      };
    }), currentIndex, direction);
  }

  function scrollReader(direction) {
    var scroller = document.getElementById('reader-scroll');
    if (!scroller) {
      return;
    }

    var distance = Math.max(120, Math.round(scroller.clientHeight * 0.72));
    var top = direction === 'down' ? distance : -distance;
    scroller.scrollBy({ top: top, behavior: 'smooth' });
  }

  function moveReaderControlFocus(direction) {
    var reader = screens.reader;
    if (!reader) {
      return false;
    }

    var controls = getVisibleFocusables(reader.querySelector('.nav-bar'));
    if (!controls.length) {
      return false;
    }

    var index = controls.indexOf(document.activeElement);
    if (index === -1) {
      index = controls.findIndex(function(control) {
        return control.dataset.action === 'open-chapter-picker';
      });
      if (index === -1) {
        index = 0;
      }
    } else if (direction === 'left') {
      index = index > 0 ? index - 1 : controls.length - 1;
    } else {
      index = index < controls.length - 1 ? index + 1 : 0;
    }

    controls[index].focus();
    return true;
  }

  function focusFirstResult() {
    if (state.currentScreen !== 'home') {
      return;
    }

    var firstResult = document.querySelector('#results-list .focusable[data-action="open-result"]');
    if (!firstResult) {
      return;
    }

    firstResult.focus();
    firstResult.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function focusSearchKeypad() {
    var target = document.querySelector('.key-grid .focusable[data-char="A"]');
    if (!target) {
      return;
    }
    target.focus();
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function focusFavoritesList() {
    var favorite = document.querySelector('#favorites-list .focusable');
    var panel = document.getElementById('favorites-list');
    if (favorite) {
      favorite.focus();
      favorite.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    if (panel) {
      panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    showToast('No favorites saved yet', 'error');
  }

  function setLoading(isLoading, message) {
    state.isLoading = isLoading;
    var spinner = document.getElementById('loading');
    var loadingText = spinner ? spinner.querySelector('.loading-text') : null;
    if (loadingText && message) {
      loadingText.textContent = message;
    }
    if (spinner) {
      spinner.classList.toggle('hidden', !isLoading);
    }
    setStatus(isLoading ? 'Loading' : 'Ready');
  }

  function setError(message) {
    state.error = message;
    var errorEl = document.getElementById('error');
    if (!errorEl) {
      return;
    }
    errorEl.classList.remove('hidden');
    var msgEl = errorEl.querySelector('.error-message');
    if (msgEl) {
      msgEl.textContent = message;
    }
    setStatus('Retry');
  }

  function clearError() {
    state.error = null;
    var errorEl = document.getElementById('error');
    if (errorEl) {
      errorEl.classList.add('hidden');
    }
  }

  function setStatus(message) {
    ['status-indicator', 'detail-status'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        el.textContent = message;
      }
    });
  }

  function renderReleaseBadge(environment) {
    var badge = document.getElementById('release-badge');
    if (!badge || !environment || environment.showReleaseBadge === false) {
      return;
    }
    badge.textContent = formatReleaseBadge(release.version, environment.name);
    badge.setAttribute('title', release.label + ' (' + release.type + ')');
  }

  function showToast(message, type) {
    var toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast visible' + (type ? ' ' + type : '');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function() {
      toast.classList.remove('visible');
    }, 2600);
  }

  function loadData() {
    state.data = loadStoredData(CONFIG.storageKey, state.data);
  }

  function normalizeStoredData() {
    state.data = normalizePersistedData(state.data);
  }

  function saveData() {
    saveStoredData(CONFIG.storageKey, state.data);
  }

  function withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise(function(_, reject) {
        setTimeout(function() {
          reject(new Error('Request timed out'));
        }, timeoutMs || CONFIG.requestTimeout);
      })
    ]);
  }

  function proxyUrl(url) {
    return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
  }

  function readerMirrorUrl(url) {
    return 'https://r.jina.ai/http://' + url.replace(/^https?:\/\//i, '');
  }

  function fetchText(url, options) {
    options = options || {};
    var cacheKey = options.cacheKey || url;
    var cached = state.cache[cacheKey];
    if (!options.noCache && cached && (Date.now() - cached.timestamp) < CONFIG.cacheDuration) {
      return Promise.resolve(cached.data);
    }

    if (!options.silent) {
      state.lastRequest = options.retry;
    }
    setLoading(true, options.loadingMessage || 'Loading…');
    clearError();

    return withTimeout(fetch(url).then(function(response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.text();
    }), options.timeoutMs).then(function(text) {
      state.cache[cacheKey] = {
        timestamp: Date.now(),
        data: text
      };
      setLoading(false);
      return text;
    }).catch(function(error) {
      setLoading(false);
      throw error;
    });
  }

  function fetchHtmlWithFallback(url, options) {
    return fetchText(proxyUrl(url), options).catch(function() {
      return fetchText(readerMirrorUrl(url), options);
    });
  }

  function apiJson(path, options) {
    options = options || {};
    var cacheKey = options.cacheKey || path;
    var cached = state.cache[cacheKey];
    if (!options.noCache && cached && (Date.now() - cached.timestamp) < CONFIG.cacheDuration) {
      return Promise.resolve(cached.data);
    }

    state.lastRequest = options.retry;
    if (!options.silent) {
      setLoading(true, options.loadingMessage || 'Loading…');
      clearError();
    }

    return withTimeout(fetch(CONFIG.apiBaseUrl + path).then(function(response) {
      if (!response.ok) {
        return response.json().catch(function() {
          return { error: 'HTTP ' + response.status };
        }).then(function(payload) {
          throw new Error(payload.error || ('HTTP ' + response.status));
        });
      }
      return response.json();
    }), options.timeoutMs).then(function(data) {
      state.cache[cacheKey] = {
        timestamp: Date.now(),
        data: data
      };
      if (!options.silent) {
        setLoading(false);
      }
      return data;
    }).catch(function(error) {
      if (!options.silent) {
        setLoading(false);
      }
      throw error;
    });
  }

  function decodeHtml(value) {
    var textarea = document.createElement('textarea');
    textarea.innerHTML = value || '';
    return textarea.value;
  }

  function stripSiteSuffix(text) {
    return (text || '')
      .replace(/\s*-\s*ReadNovelFull.*$/i, '')
      .replace(/\s*\|\s*DuckDuckGo.*$/i, '')
      .trim();
  }

  function absoluteNovelUrl(url) {
    if (!url) {
      return '';
    }
    if (/^https?:\/\//i.test(url)) {
      return url;
    }
    return new URL(url, 'https://readnovelfull.com').toString();
  }

  function isNovelUrl(url) {
    return /readnovelfull\.com\/[^?#]+\.html$/i.test(url) &&
      !/\/chapter-[^/]+\.html$/i.test(url);
  }

  function isChapterUrl(url) {
    return /readnovelfull\.com\/.+\/chapter-[^?#]+\.html$/i.test(url);
  }

  function parseDdgResults(htmlText) {
    var doc = new DOMParser().parseFromString(htmlText, 'text/html');
    var anchors = Array.from(doc.querySelectorAll('a[href]'));
    var seen = {};

    return anchors.map(function(anchor) {
      var href = anchor.getAttribute('href') || '';
      var decodedHref = decodeURIComponent(href);
      var match = decodedHref.match(/https?:\/\/readnovelfull\.com\/[^&\s]+/i);
      var url = match ? match[0] : href;
      return {
        title: stripSiteSuffix(anchor.textContent.trim()),
        url: absoluteNovelUrl(url)
      };
    }).filter(function(item) {
      if (!item.title || !isNovelUrl(item.url) || seen[item.url]) {
        return false;
      }
      seen[item.url] = true;
      return true;
    }).slice(0, 12);
  }

  function parseMirrorResults(text) {
    var results = [];
    var seen = {};
    var linkRegex = /\[([^\]]+)\]\((https?:\/\/readnovelfull\.com\/[^)\s]+)\)/gi;
    var match;

    while ((match = linkRegex.exec(text))) {
      var item = {
        title: stripSiteSuffix(match[1]),
        url: absoluteNovelUrl(match[2])
      };
      if (isNovelUrl(item.url) && !seen[item.url]) {
        results.push(item);
        seen[item.url] = true;
      }
    }

    return results.slice(0, 12);
  }

  function parseNovelFromHtml(htmlText, sourceUrl) {
    var doc = new DOMParser().parseFromString(htmlText, 'text/html');
    var title =
      textFrom(doc.querySelector('h1')) ||
      textFrom(doc.querySelector('h2')) ||
      textFrom(doc.querySelector('h3')) ||
      'Novel';

    var chapterAnchors = Array.from(doc.querySelectorAll('a[href*="/chapter-"]'));
    var chapters = chapterAnchors.map(function(anchor) {
      return {
        title: cleanWhitespace(anchor.textContent),
        url: absoluteNovelUrl(anchor.href)
      };
    }).filter(function(item, index, list) {
      return item.title && isChapterUrl(item.url) &&
        list.findIndex(function(other) { return other.url === item.url; }) === index;
    });

    var pageText = cleanWhitespace(doc.body ? doc.body.textContent : '');
    var ratingMatch = pageText.match(/Rating:\s*([0-9.]+\s*\/\s*10)/i);
    var description = extractDescriptionFromHtml(doc) || extractDescriptionFromText(pageText);
    var author = extractLabeledValue(pageText, 'Author');
    var genres = extractLabeledValue(pageText, 'Genre');

    return {
      title: stripSiteSuffix(title),
      author: author || 'Author unavailable',
      genres: genres || 'Genres unavailable',
      rating: ratingMatch ? ratingMatch[1] : '--',
      description: description || 'No description was available from the source page.',
      chapters: chapters,
      url: sourceUrl
    };
  }

  function parseNovelFromMirror(text, sourceUrl) {
    var lines = text.split(/\r?\n/).map(function(line) {
      return cleanWhitespace(line);
    }).filter(Boolean);

    var title = firstMatch(text, /##\s+Novel info[\s\S]*?###\s+(.+?)\n/i) ||
      firstMatch(text, /###\s+(.+?)\n/);

    var author = valueAfterLine(lines, '### Author:') || valueAfterLine(lines, 'Author:');
    var genres = valueAfterLine(lines, '### Genre:') || valueAfterLine(lines, 'Genre:');
    var rating = firstMatch(text, /Rating:\s*([0-9.]+\s*\/\s*10)/i) || '--';

    var descriptionStart = lines.indexOf('Description');
    var description = '';
    if (descriptionStart !== -1) {
      var collected = [];
      for (var i = descriptionStart + 1; i < lines.length; i += 1) {
        if (/^Chapter\s+\d+/i.test(lines[i]) || /^Chapter List$/i.test(lines[i])) {
          break;
        }
        collected.push(lines[i]);
      }
      description = collected.join(' ');
    }

    var chapters = [];
    var chapterRegex = /\[([^\]]*Chapter[^\]]*)\]\((https?:\/\/readnovelfull\.com\/[^)\s]+chapter[^)\s]+\.html)\)/gi;
    var match;
    while ((match = chapterRegex.exec(text))) {
      chapters.push({
        title: cleanWhitespace(match[1]),
        url: absoluteNovelUrl(match[2])
      });
    }

    return {
      title: stripSiteSuffix(title || 'Novel'),
      author: author || 'Author unavailable',
      genres: genres || 'Genres unavailable',
      rating: rating,
      description: description || 'No description was available from the source page.',
      chapters: chapters,
      url: sourceUrl
    };
  }

  function parseChapterFromHtml(htmlText, sourceUrl) {
    var doc = new DOMParser().parseFromString(htmlText, 'text/html');
    var title =
      textFrom(doc.querySelector('#chr-content h4')) ||
      textFrom(doc.querySelector('.chapter-title')) ||
      textFrom(doc.querySelector('h2')) ||
      textFrom(doc.querySelector('h1')) ||
      'Chapter';

    var contentRoot =
      doc.querySelector('#chr-content') ||
      doc.querySelector('#chapter-content') ||
      doc.querySelector('.chapter-content') ||
      doc.querySelector('.reading-content');

    var paragraphs = [];
    if (contentRoot) {
      paragraphs = Array.from(contentRoot.querySelectorAll('p')).map(function(node) {
        return cleanWhitespace(node.textContent);
      }).filter(Boolean);
    }

    if (!paragraphs.length && contentRoot) {
      paragraphs = cleanWhitespace(contentRoot.textContent).split(/\n+/).filter(Boolean);
    }

    var prev = selectChapterLink(doc, ['#prev_chap', 'a[rel="prev"]'], /Prev Chapter/i);
    var next = selectChapterLink(doc, ['#next_chap', 'a[rel="next"]'], /Next Chapter/i);

    return {
      title: cleanWhitespace(title),
      paragraphs: sanitizeParagraphs(paragraphs),
      prevUrl: prev,
      nextUrl: next,
      url: sourceUrl
    };
  }

  function parseChapterFromMirror(text, sourceUrl) {
    var lines = text.split(/\r?\n/).map(function(line) {
      return cleanWhitespace(line);
    }).filter(Boolean);

    var title = firstMatch(text, /###\s+(Chapter[^\n]+)/i) ||
      firstMatch(text, /##\s+(Chapter[^\n]+)/i) ||
      'Chapter';

    var startIndex = lines.findIndex(function(line) {
      return /^###\s*Chapter/i.test(line) || /^Chapter\s+\d+/i.test(line);
    });
    var endIndex = lines.findIndex(function(line) {
      return /^(Prev Chapter|Report chapter|Tip:)/i.test(line);
    });

    var slice = lines.slice(startIndex === -1 ? 0 : startIndex + 1, endIndex === -1 ? lines.length : endIndex);
    slice = slice.filter(function(line) {
      return !/^Translator:/i.test(line) && !/^Editor:/i.test(line) && line !== '* * *';
    });

    return {
      title: cleanWhitespace(title),
      paragraphs: sanitizeParagraphs(slice),
      prevUrl: firstMatch(text, /\[Prev Chapter\]\((https?:\/\/readnovelfull\.com\/[^)]+)\)/i),
      nextUrl: firstMatch(text, /\[Next Chapter\]\((https?:\/\/readnovelfull\.com\/[^)]+)\)/i),
      url: sourceUrl
    };
  }

  function textFrom(node) {
    return node ? cleanWhitespace(node.textContent) : '';
  }

  function cleanWhitespace(value) {
    return (value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s+\n/g, '\n')
      .trim();
  }

  function extractLabeledValue(pageText, label) {
    var regex = new RegExp(label + '\\s*:?\\s*([^\\n]+)', 'i');
    var match = pageText.match(regex);
    return match ? cleanWhitespace(match[1]) : '';
  }

  function extractDescriptionFromHtml(doc) {
    var selectors = [
      '#tab-description',
      '.desc-text',
      '.desc',
      '.content p',
      '.summary p'
    ];

    for (var i = 0; i < selectors.length; i += 1) {
      var node = doc.querySelector(selectors[i]);
      if (node) {
        var text = cleanWhitespace(node.textContent);
        if (text && text.length > 80) {
          return text;
        }
      }
    }
    return '';
  }

  function extractDescriptionFromText(pageText) {
    var match = pageText.match(/Description\s+([\s\S]{80,800}?)\s+Chapter List/i);
    return match ? cleanWhitespace(match[1]) : '';
  }

  function valueAfterLine(lines, label) {
    var index = lines.indexOf(label);
    if (index !== -1 && lines[index + 1]) {
      return cleanWhitespace(lines[index + 1]);
    }
    return '';
  }

  function firstMatch(text, regex) {
    var match = text.match(regex);
    return match ? cleanWhitespace(match[1]) : '';
  }

  function selectChapterLink(doc, selectors, textPattern) {
    for (var i = 0; i < selectors.length; i += 1) {
      var found = doc.querySelector(selectors[i]);
      if (found && found.href) {
        return absoluteNovelUrl(found.href);
      }
    }

    var anchors = Array.from(doc.querySelectorAll('a[href]'));
    var anchor = anchors.find(function(item) {
      return textPattern.test(item.textContent);
    });
    return anchor ? absoluteNovelUrl(anchor.href) : '';
  }

  function sanitizeParagraphs(lines) {
    return lines.filter(function(line) {
      return line &&
        !/^Prev Chapter/i.test(line) &&
        !/^Next Chapter/i.test(line) &&
        !/^ReadNovelFull\.Com/i.test(line) &&
        !/^Comments$/i.test(line) &&
        !/^Please enable JavaScript/i.test(line);
    }).map(function(line) {
      return line.replace(/^#+\s*/, '');
    });
  }

  function renderResults() {
    var list = document.getElementById('results-list');
    var meta = document.getElementById('results-meta');
    var clearButton = document.querySelector('[data-action="clear-results"]');
    list.innerHTML = '';
    if (clearButton) {
      clearButton.classList.toggle('is-disabled', !state.results.length && !state.searchingQuery && !state.resultsCleared);
    }

    if (state.searchingQuery) {
      list.innerHTML = '<div class="empty-state">Searching for "' + escapeHtml(state.searchingQuery) + '"...</div>';
      meta.textContent = 'Searching...';
      return;
    }

    if (state.resultsCleared) {
      list.innerHTML = '<div class="empty-state">Results cleared. Your typed search is still there, so press Search when you want to run it again.</div>';
      meta.textContent = 'Cleared';
      return;
    }

    if (!state.results.length) {
      list.innerHTML = '<div class="empty-state">Search results will appear here. Use a novel title, not a chapter title, for cleaner matches.</div>';
      meta.textContent = state.data.recentQuery ? '0 matches' : 'No search yet';
      return;
    }

    meta.textContent = state.results.length + ' matches';
    state.results.forEach(function(item, index) {
      list.insertAdjacentHTML('beforeend', [
        '<button class="list-item focusable" data-action="open-result" data-index="' + index + '">',
        '<span class="list-item-icon">&#128214;</span>',
        '<span class="list-item-content">',
        '<span class="list-item-title">' + escapeHtml(item.title) + '</span>',
        '<span class="list-item-meta">' + escapeHtml(shortNovelSlug(item.url)) + '</span>',
        '</span>',
        '<span class="list-item-badge">Open</span>',
        '</button>'
      ].join(''));
    });
  }

  function renderResume() {
    var container = document.getElementById('resume-card');
    var heroResumeMeta = document.getElementById('hero-resume-meta');
    var saved = state.data.lastNovel;

    if (!saved || !saved.url) {
      if (heroResumeMeta) {
        heroResumeMeta.textContent = 'Nothing yet';
      }
      container.innerHTML = '<div class="empty-state">Nothing saved yet. Open a novel or chapter and it will appear here for quick resume.</div>';
      return;
    }

    if (heroResumeMeta) {
      heroResumeMeta.textContent = saved.chapterTitle ? 'Continue chapter' : 'Open saved novel';
    }

    container.innerHTML = [
      '<button class="list-item focusable resume-card" data-action="resume-last">',
      '<span class="list-item-icon">&#9205;</span>',
      '<span class="list-item-content">',
      '<span class="list-item-title">' + escapeHtml(saved.title || 'Resume reading') + '</span>',
      '<span class="list-item-meta">' + escapeHtml(saved.chapterTitle || 'Open the saved chapter or detail page') + '</span>',
      '</span>',
      '<span class="list-item-badge">Resume</span>',
      '</button>'
    ].join('');
  }

  function renderRecent() {
    var list = document.getElementById('recent-list');
    var meta = document.getElementById('recent-meta');
    if (!list || !meta) {
      return;
    }

    var recent = state.data.recentNovels || [];
    meta.textContent = recent.length + ' opened';
    list.innerHTML = '';

    if (!recent.length) {
      list.innerHTML = '<div class="empty-state">Recently opened novels will appear here, even if they are not favorites.</div>';
      return;
    }

    recent.slice(0, 5).forEach(function(item, index) {
      list.insertAdjacentHTML('beforeend', [
        '<button class="list-item focusable" data-action="open-recent" data-index="' + index + '">',
        '<span class="list-item-icon">&#8635;</span>',
        '<span class="list-item-content">',
        '<span class="list-item-title">' + escapeHtml(item.title || 'Recent novel') + '</span>',
        '<span class="list-item-meta">' + escapeHtml(item.chapterTitle || 'Open novel page') + '</span>',
        '</span>',
        '<span class="list-item-badge">Open</span>',
        '</button>'
      ].join(''));
    });
  }

  function renderFavorites() {
    var list = document.getElementById('favorites-list');
    var meta = document.getElementById('favorites-meta');
    if (!list || !meta) {
      return;
    }

    var favorites = state.data.favorites || [];
    meta.textContent = favorites.length + ' saved';
    list.innerHTML = '';

    if (!favorites.length) {
      list.innerHTML = '<div class="empty-state">Favorite novels appear here. Open starts at the novel page; Resume appears once a chapter is saved.</div>';
      return;
    }

    favorites.slice(0, 6).forEach(function(item, index) {
      list.insertAdjacentHTML('beforeend', [
        '<div class="favorite-row">',
        '<button class="list-item focusable is-favorite favorite-open" data-action="open-favorite" data-index="' + index + '">',
        '<span class="list-item-icon">&#9733;</span>',
        '<span class="list-item-content">',
        '<span class="list-item-title">' + escapeHtml(item.title || 'Favorite novel') + '</span>',
        '<span class="list-item-meta">Open novel page</span>',
        '</span>',
        '<span class="list-item-badge">Open</span>',
        '</button>',
        item.chapterUrl ? [
          '<button class="mini-action focusable" data-action="resume-favorite" data-index="' + index + '">',
          '<span class="mini-action-title">Resume</span>',
          '<span class="mini-action-meta">' + escapeHtml(getFavoriteResumeMeta(item)) + '</span>',
          '</button>'
        ].join('') : '',
        '</div>'
      ].join(''));
    });
  }

  function renderNovelDetail(novel) {
    document.getElementById('detail-title').textContent = novel.title || 'Novel';
    document.getElementById('detail-author').textContent = novel.author || 'Author unavailable';
    document.getElementById('detail-rating').textContent = novel.rating ? ('Rating ' + novel.rating) : 'Rating --';
    document.getElementById('detail-genres').textContent = novel.genres || 'Genres unavailable';
    document.getElementById('detail-description').textContent = novel.description || 'No description available.';

    var list = document.getElementById('chapter-list');
    list.innerHTML = '';

    if (!novel.chapters.length) {
      document.getElementById('detail-current-chapter').textContent = 'Chapters';
      document.getElementById('chapter-count').textContent = '0 found';
      list.innerHTML = '<div class="empty-state">No chapter links were extracted. Try Refresh or search for a different result.</div>';
      return;
    }

    renderDetailChapterWindow();
  }

  function renderDetailChapterWindow() {
    var list = document.getElementById('chapter-list');
    if (!list || !state.currentNovel) {
      return;
    }

    var chapters = state.currentNovel.chapters || [];
    if (!chapters.length) {
      return;
    }

    state.detailChapterIndex = Math.min(
      chapters.length - 1,
      Math.max(0, state.detailChapterIndex || 0)
    );

    var currentIndex = getCurrentChapterIndex();
    var start = Math.max(0, state.detailChapterIndex - 10);
    var end = Math.min(chapters.length, start + 24);
    start = Math.max(0, end - 24);

    var selected = chapters[state.detailChapterIndex];
    document.getElementById('detail-current-chapter').textContent = selected ? selected.title : 'Chapters';
    document.getElementById('chapter-count').textContent = chapters.length + ' total';

    list.innerHTML = '';
    chapters.slice(start, end).forEach(function(chapter, offset) {
      var index = start + offset;
      var currentClass = index === currentIndex ? ' is-current' : '';
      var selectedClass = index === state.detailChapterIndex ? ' is-selected' : '';
      list.insertAdjacentHTML('beforeend', [
        '<button class="list-item focusable' + currentClass + selectedClass + '" data-action="open-chapter-from-list" data-index="' + index + '">',
        '<span class="list-item-icon">&#10148;</span>',
        '<span class="list-item-content">',
        '<span class="list-item-title">' + escapeHtml(chapter.title || ('Chapter ' + (index + 1))) + '</span>',
        '<span class="list-item-meta">' + escapeHtml(getProgressLabel(chapter.url)) + '</span>',
        '</span>',
        '<span class="list-item-badge">' + (index + 1) + '</span>',
        '</button>'
      ].join(''));
    });
  }

  function renderChapter(chapter) {
    document.getElementById('reader-title').textContent = chapter.title || 'Chapter';
    document.getElementById('reader-subtitle').textContent = state.currentNovel ? state.currentNovel.title : 'ReadNovelFull';

    var body = document.getElementById('reader-body');
    body.innerHTML = '';

    if (!chapter.paragraphs.length) {
      body.innerHTML = '<p class="reader-placeholder">No readable text was extracted for this chapter.</p>';
    } else {
      chapter.paragraphs.forEach(function(paragraph) {
        body.insertAdjacentHTML('beforeend', '<p>' + escapeHtml(paragraph) + '</p>');
      });
    }

    updateReaderProgress(0);
    document.getElementById('reader-scroll').scrollTop = 0;
    syncReadingState();
  }

  function renderChapterLoading(chapter) {
    document.getElementById('reader-title').textContent = chapter.title || 'Loading chapter';
    document.getElementById('reader-subtitle').textContent = state.currentNovel ? state.currentNovel.title : 'ReadNovelFull';
    document.getElementById('reader-progress').textContent = '...';

    var body = document.getElementById('reader-body');
    body.innerHTML = [
      '<p class="reader-placeholder">Loading selected chapter...</p>',
      '<p class="reader-placeholder">This should replace the old chapter as soon as the text arrives.</p>'
    ].join('');
    document.getElementById('reader-scroll').scrollTop = 0;
  }

  function renderChapterPicker() {
    var list = document.getElementById('picker-list');
    if (!list || !state.currentNovel) {
      return;
    }

    var chapters = state.currentNovel.chapters || [];
    var currentIndex = getCurrentChapterIndex();

    var start = Math.max(0, state.pickerIndex - 10);
    var end = Math.min(chapters.length, start + 24);
    start = Math.max(0, end - 24);

    document.getElementById('picker-subtitle').textContent = state.currentNovel.title || 'Choose chapter';
    document.getElementById('picker-count').textContent = chapters.length + '';
    document.getElementById('picker-current').textContent = chapters[state.pickerIndex] ? chapters[state.pickerIndex].title : 'Current chapter';
    document.getElementById('picker-window').textContent = (start + 1) + '-' + end;
    renderChapterJumpValue();

    list.innerHTML = '';
    chapters.slice(start, end).forEach(function(chapter, offset) {
      var index = start + offset;
      var currentClass = index === currentIndex ? ' is-current' : '';
      list.insertAdjacentHTML('beforeend', [
        '<button class="list-item focusable' + currentClass + '" data-action="open-chapter-from-list" data-index="' + index + '">',
        '<span class="list-item-icon">&#10148;</span>',
        '<span class="list-item-content">',
        '<span class="list-item-title">' + escapeHtml(chapter.title || ('Chapter ' + (index + 1))) + '</span>',
        '<span class="list-item-meta">' + escapeHtml(getProgressLabel(chapter.url)) + '</span>',
        '</span>',
        '<span class="list-item-badge">' + (index + 1) + '</span>',
        '</button>'
      ].join(''));
    });
  }

  function updateReaderProgress(scrollTop) {
    var scroller = document.getElementById('reader-scroll');
    var max = Math.max(scroller.scrollHeight - scroller.clientHeight, 1);
    var ratio = Math.min(1, Math.max(0, scrollTop / max));
    document.getElementById('reader-progress').textContent = Math.round(ratio * 100) + '%';
    saveChapterProgress(ratio);
  }

  function renderReaderSettings() {
    var settings = state.data.readerSettings;
    var fontLabel = document.getElementById('setting-font-label');
    var spaceLabel = document.getElementById('setting-space-label');
    var comfortLabel = document.getElementById('setting-comfort-label');
    var comfortBadge = document.getElementById('setting-comfort-badge');
    var summary = document.getElementById('settings-summary');

    if (fontLabel) {
      fontLabel.textContent = settings.fontSize + 'px';
    }
    if (spaceLabel) {
      spaceLabel.textContent = readerPreferences.describeLineSpace(settings.lineSpace);
    }
    if (comfortLabel) {
      comfortLabel.textContent = settings.comfort ? 'Warmer reading text' : 'Cool bright text';
    }
    if (comfortBadge) {
      comfortBadge.textContent = settings.comfort ? 'On' : 'Off';
    }
    if (summary) {
      summary.textContent = settings.fontSize + 'px';
    }
  }

  function applyReaderSettings() {
    state.data.readerSettings = readerPreferences.normalizeReaderSettings(state.data.readerSettings);
    var settings = state.data.readerSettings;
    var vars = readerPreferences.getReaderStyleVars(settings);
    var root = document.documentElement;
    root.style.setProperty('--reader-font-size', vars.fontSize);
    root.style.setProperty('--reader-line-height', vars.lineHeight);
    root.style.setProperty('--reader-gap', vars.gap);
    root.style.setProperty('--reader-color', vars.color);
    renderReaderSettings();
  }

  function setFocusMode(enabled) {
    state.focusMode = !!enabled;
    var reader = document.getElementById('reader');
    var button = document.getElementById('focus-mode-button');
    if (reader) {
      reader.classList.toggle('focus-mode', state.focusMode);
    }
    if (button) {
      button.textContent = state.focusMode ? 'Exit' : 'Focus';
    }
  }

  function renderChapterJumpValue() {
    var el = document.getElementById('chapter-jump-value');
    if (el) {
      el.textContent = state.chapterJumpValue ? ('#' + state.chapterJumpValue) : '--';
    }
  }

  function shortChapterSlug(url) {
    return url.replace(/^https?:\/\/readnovelfull\.com\//i, '').replace(/\.html$/i, '');
  }

  function shortNovelSlug(url) {
    return (url || '').replace(/^https?:\/\/readnovelfull\.com\//i, '').replace(/\.html$/i, '');
  }

  function normalizeResultKey(item) {
    var urlKey = (item.url || '')
      .replace(/^https?:\/\//i, '')
      .replace(/^readnovelfull\.com\//i, '')
      .replace(/\.html(?:[?#].*)?$/i, '')
      .replace(/\/+$/g, '')
      .toLowerCase();
    var titleKey = (item.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    return urlKey || titleKey;
  }

  function normalizeResults(results) {
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

  function escapeHtml(value) {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function runSearch(query) {
    query = textUtils.cleanWhitespace(query || document.getElementById('search-input').value);
    if (!query) {
      showToast('Type a novel title first', 'error');
      return Promise.resolve();
    }

    document.getElementById('search-input').value = query;
    updateQueryPreview();
    state.data.recentQuery = query;
    state.results = [];
    state.searchingQuery = query;
    state.resultsCleared = false;
    var requestId = state.searchRequestId + 1;
    state.searchRequestId = requestId;
    saveData();
    renderResults();

    return apiJson('/api/search?q=' + encodeURIComponent(query), {
      cacheKey: 'search:' + query.toLowerCase(),
      loadingMessage: 'Searching…',
      retry: function() { runSearch(query); }
    }).then(function(payload) {
      if (requestId !== state.searchRequestId) {
        return;
      }
      state.searchingQuery = '';
      state.results = textUtils.normalizeResults(payload.results || []);
      renderResults();
      renderResume();
      if (state.results.length) {
        focusFirstResult();
        showToast('Found ' + state.results.length + ' novels', 'success');
      } else {
        showToast('No results found', 'error');
      }
    }).catch(function(error) {
      if (requestId !== state.searchRequestId) {
        return;
      }
      state.searchingQuery = '';
      setError(error.message || 'Search failed');
      renderResults();
    });
  }

  function loadNovel(url) {
    return apiJson('/api/novel?url=' + encodeURIComponent(url), {
      cacheKey: 'novel:' + url,
      loadingMessage: 'Loading novel…',
      retry: function() { loadNovel(url); }
    }).then(function(novel) {
      state.currentNovel = novel;
      state.detailChapterIndex = getSavedChapterIndex(novel);
      state.pickerIndex = state.detailChapterIndex;
      state.data.currentNovel = {
        title: novel.title,
        url: novel.url
      };
      state.data.lastNovel = Object.assign({}, state.data.lastNovel || {}, {
        title: novel.title,
        url: novel.url,
        chapterTitle: state.data.lastNovel && state.data.lastNovel.url === novel.url ? state.data.lastNovel.chapterTitle : '',
        chapterUrl: state.data.lastNovel && state.data.lastNovel.url === novel.url ? state.data.lastNovel.chapterUrl : ''
      });
      saveData();
      addRecentNovel({
        title: novel.title,
        url: novel.url,
        chapterTitle: state.data.lastNovel && state.data.lastNovel.url === novel.url ? state.data.lastNovel.chapterTitle : '',
        chapterUrl: state.data.lastNovel && state.data.lastNovel.url === novel.url ? state.data.lastNovel.chapterUrl : ''
      });
      renderNovelDetail(novel);
      renderRecent();
      renderFavorites();
      navigateTo('detail');
      return novel;
    }).catch(function(error) {
      setError(error.message || 'Could not load novel');
      throw error;
    });
  }

  function loadChapter(url, options) {
    options = options || {};
    if (options.preferredReaderAction) {
      state.preferredReaderAction = options.preferredReaderAction;
    }
    var chapterPreview = findChapterByUrl(url);
    if (options.showLoading !== false && chapterPreview) {
      renderChapterLoading(chapterPreview);
      navigateTo('reader', { addToHistory: options.addToHistory !== false });
    }

    return apiJson('/api/chapter?url=' + encodeURIComponent(url), {
      cacheKey: 'chapter:' + url,
      loadingMessage: 'Loading chapter…',
      retry: function() { loadChapter(url); }
    }).then(function(chapter) {
      applyChapterNeighbors(chapter);
      state.currentChapter = chapter;
      state.data.currentChapter = {
        title: chapter.title,
        url: chapter.url
      };
      syncReadingState();
      state.restoringProgress = !!options.restoreProgress;
      renderChapter(chapter);
      addRecentNovel({
        title: state.currentNovel ? state.currentNovel.title : '',
        url: state.currentNovel ? state.currentNovel.url : '',
        chapterTitle: chapter.title,
        chapterUrl: chapter.url
      });
      prefetchAdjacentChapters(chapter);
      if (state.currentScreen !== 'reader') {
        navigateTo('reader', { addToHistory: options.addToHistory !== false });
      }
      if (options.restoreProgress) {
        restoreChapterProgress(chapter.url);
      } else {
        state.restoringProgress = false;
      }
      return chapter;
    }).catch(function(error) {
      setError(error.message || 'Could not load chapter');
      throw error;
    });
  }

  function syncReadingState() {
    var progress = getSavedProgress(state.currentChapter ? state.currentChapter.url : '');
    state.data.lastNovel = Object.assign({}, state.data.lastNovel || {}, {
      title: state.currentNovel ? state.currentNovel.title : (state.data.lastNovel && state.data.lastNovel.title),
      url: state.currentNovel ? state.currentNovel.url : (state.data.lastNovel && state.data.lastNovel.url),
      chapterTitle: state.currentChapter ? state.currentChapter.title : '',
      chapterUrl: state.currentChapter ? state.currentChapter.url : '',
      progress: progress
    });
    updateFavoriteProgress(progress);
    saveData();
    renderResume();
    renderRecent();
    renderFavorites();
  }

  function resumeLast() {
    var saved = state.data.lastNovel;
    if (!saved || !saved.url) {
      showToast('Nothing to resume yet', 'error');
      return;
    }

    if (saved.chapterUrl) {
      if (state.currentNovel && state.currentNovel.url === saved.url) {
        loadChapter(saved.chapterUrl, { restoreProgress: true });
        return;
      }

      loadNovel(saved.url).then(function() {
        loadChapter(saved.chapterUrl, { restoreProgress: true });
      });
      return;
    }

    loadNovel(saved.url);
  }

  function handleAction(action, element) {
    switch (action) {
      case 'back':
        navigateBack();
        break;
      case 'go-home':
        goHome();
        break;
      case 'focus-search':
        focusSearchKeypad();
        break;
      case 'focus-favorites':
        focusFavoritesList();
        break;
      case 'run-search':
        runSearch();
        break;
      case 'clear-results':
        clearResults();
        break;
      case 'retry-last':
        if (typeof state.lastRequest === 'function') {
          state.lastRequest();
        }
        break;
      case 'resume-last':
        resumeLast();
        break;
      case 'open-recent':
        openRecent(Number(element.dataset.index));
        break;
      case 'open-favorite':
        openFavorite(Number(element.dataset.index));
        break;
      case 'resume-favorite':
        resumeFavorite(Number(element.dataset.index));
        break;
      case 'quick-search':
        document.getElementById('search-input').value = element.dataset.value || '';
        updateQueryPreview();
        runSearch(element.dataset.value || '');
        break;
      case 'fill-example':
        document.getElementById('search-input').value = element.dataset.value || '';
        updateQueryPreview();
        document.getElementById('search-input').focus();
        break;
      case 'append-char':
        appendQueryChar(element.dataset.char || '');
        break;
      case 'delete-char':
        deleteQueryChar();
        break;
      case 'clear-query':
        setQuery('');
        break;
      case 'open-result':
        openResult(Number(element.dataset.index));
        break;
      case 'refresh-novel':
        if (state.currentNovel) {
          delete state.cache['novel:' + state.currentNovel.url];
          loadNovel(state.currentNovel.url);
        }
        break;
      case 'toggle-novel-favorite':
        toggleNovelFavorite();
        break;
      case 'open-chapter-picker':
        state.pickerIndex = Math.max(0, getCurrentChapterIndex());
        state.chapterJumpValue = '';
        renderChapterPicker();
        navigateTo('chapter-picker');
        break;
      case 'open-reader-settings':
        renderReaderSettings();
        navigateTo('reader-settings');
        break;
      case 'toggle-reader-focus':
        setFocusMode(!state.focusMode);
        if (state.currentScreen === 'reader-settings') {
          navigateBack();
        }
        break;
      case 'reader-font':
        adjustReaderFont(Number(element.dataset.delta || 0));
        break;
      case 'reader-space':
        adjustReaderSpace(Number(element.dataset.delta || 0));
        break;
      case 'toggle-reader-comfort':
        toggleReaderComfort();
        break;
      case 'chapter-window':
        moveChapterWindow(Number(element.dataset.delta || 0));
        break;
      case 'append-chapter-digit':
        appendChapterDigit(element.dataset.digit || '');
        break;
      case 'clear-chapter-jump':
        state.chapterJumpValue = '';
        renderChapterJumpValue();
        break;
      case 'go-chapter-jump':
        goChapterJump();
        break;
      case 'detail-chapter-window':
        moveDetailChapterWindow(Number(element.dataset.delta || 0));
        break;
      case 'open-detail-current':
        openChapterFromList(state.detailChapterIndex || 0);
        break;
      case 'open-picker-current':
        openChapterFromList(state.pickerIndex || 0);
        break;
      case 'open-first-chapter':
        if (state.currentNovel && state.currentNovel.chapters[0]) {
          loadChapter(state.currentNovel.chapters[0].url);
        }
        break;
      case 'open-chapter-from-list':
        openChapterFromList(Number(element.dataset.index));
        break;
      case 'prev-chapter':
        if (state.currentChapter && state.currentChapter.prevUrl) {
          loadChapter(state.currentChapter.prevUrl, { preferredReaderAction: 'prev-chapter' });
        } else {
          showToast('No previous chapter found', 'error');
        }
        break;
      case 'next-chapter':
        if (state.currentChapter && state.currentChapter.nextUrl) {
          loadChapter(state.currentChapter.nextUrl, { preferredReaderAction: 'next-chapter' });
        } else {
          showToast('No next chapter found', 'error');
        }
        break;
      case 'reader-top':
        document.getElementById('reader-scroll').scrollTo({ top: 0, behavior: 'smooth' });
        updateReaderProgress(0);
        break;
    }
  }

  function openResult(index) {
    var item = state.results[index];
    if (!item) {
      return;
    }
    loadNovel(item.url);
  }

  function clearResults() {
    state.searchRequestId += 1;
    state.searchingQuery = '';
    state.results = [];
    state.resultsCleared = true;
    renderResults();
    showToast('Results cleared', 'success');
  }

  function openRecent(index) {
    var item = (state.data.recentNovels || [])[index];
    if (!item) {
      return;
    }
    loadNovel(item.url);
  }

  function openChapterFromList(index) {
    if (!state.currentNovel || !state.currentNovel.chapters[index]) {
      return;
    }
    state.detailChapterIndex = index;
    state.pickerIndex = index;
    var replacePicker = state.currentScreen === 'chapter-picker';
    if (replacePicker && state.screenHistory[state.screenHistory.length - 1] === 'reader') {
      state.screenHistory.pop();
    }
    loadChapter(state.currentNovel.chapters[index].url, {
      addToHistory: !replacePicker,
      showLoading: true
    });
  }

  function openFavorite(index) {
    var favorite = (state.data.favorites || [])[index];
    if (!favorite) {
      return;
    }
    loadNovel(favorite.url).then(function() {
      showToast('Favorite opened', 'success');
    });
  }

  function resumeFavorite(index) {
    var favorite = (state.data.favorites || [])[index];
    if (!favorite || !favorite.chapterUrl) {
      showToast('No saved chapter for this favorite yet', 'error');
      return;
    }
    loadNovel(favorite.url).then(function() {
      loadChapter(favorite.chapterUrl, { restoreProgress: true });
    });
  }

  function toggleNovelFavorite() {
    if (!state.currentNovel) {
      showToast('Open a novel first', 'error');
      return;
    }

    var favorites = state.data.favorites || [];
    var index = favorites.findIndex(function(item) {
      return item.url === state.currentNovel.url;
    });

    if (index === -1) {
      favorites.unshift({
        title: state.currentNovel.title,
        url: state.currentNovel.url,
        chapterTitle: state.currentChapter ? state.currentChapter.title : '',
        chapterUrl: state.currentChapter ? state.currentChapter.url : '',
        progress: getSavedProgress(state.currentChapter ? state.currentChapter.url : ''),
        updatedAt: Date.now()
      });
      showToast('Favorite saved', 'success');
    } else {
      favorites.splice(index, 1);
      showToast('Favorite removed', 'success');
    }

    state.data.favorites = favorites.slice(0, 20);
    saveData();
    renderFavorites();
  }

  function addRecentNovel(item) {
    if (!item || !item.url) {
      return;
    }
    var recent = (state.data.recentNovels || []).filter(function(existing) {
      return existing.url !== item.url;
    });
    recent.unshift({
      title: item.title || 'Novel',
      url: item.url,
      chapterTitle: item.chapterTitle || '',
      chapterUrl: item.chapterUrl || '',
      updatedAt: Date.now()
    });
    state.data.recentNovels = recent.slice(0, 8);
    saveData();
  }

  function adjustReaderFont(delta) {
    var settings = state.data.readerSettings;
    settings.fontSize = readerPreferences.adjustFontSize(settings.fontSize, delta);
    saveData();
    applyReaderSettings();
  }

  function adjustReaderSpace(delta) {
    var settings = state.data.readerSettings;
    settings.lineSpace = readerPreferences.adjustLineSpace(settings.lineSpace, delta);
    saveData();
    applyReaderSettings();
  }

  function toggleReaderComfort() {
    state.data.readerSettings = readerPreferences.toggleComfort(state.data.readerSettings);
    saveData();
    applyReaderSettings();
  }

  function appendChapterDigit(digit) {
    state.chapterJumpValue = chapterJump.appendDigit(state.chapterJumpValue, digit);
    renderChapterJumpValue();
  }

  function goChapterJump() {
    if (!state.currentNovel || !state.currentNovel.chapters.length || !state.chapterJumpValue) {
      showToast('Enter a chapter number first', 'error');
      return;
    }
    var targetNumber = Number(state.chapterJumpValue);
    var index = chapterJump.resolveChapterJumpIndex(state.currentNovel.chapters, targetNumber);
    state.pickerIndex = index;
    renderChapterPicker();
    showToast('Jumped to chapter ' + (index + 1), 'success');
  }

  function prefetchAdjacentChapters(chapter) {
    [chapter.prevUrl, chapter.nextUrl].forEach(function(url) {
      if (!url || state.cache['chapter:' + url]) {
        return;
      }
      apiJson('/api/chapter?url=' + encodeURIComponent(url), {
        cacheKey: 'chapter:' + url,
        loadingMessage: 'Prefetching…',
        retry: null,
        silent: true
      }).catch(function() {});
    });
  }

  function moveChapterWindow(delta) {
    if (!state.currentNovel || !state.currentNovel.chapters.length) {
      return;
    }
    state.pickerIndex = Math.min(
      state.currentNovel.chapters.length - 1,
      Math.max(0, (state.pickerIndex || 0) + delta)
    );
    renderChapterPicker();
  }

  function moveDetailChapterWindow(delta) {
    if (!state.currentNovel || !state.currentNovel.chapters.length) {
      return;
    }
    state.detailChapterIndex = Math.min(
      state.currentNovel.chapters.length - 1,
      Math.max(0, (state.detailChapterIndex || 0) + delta)
    );
    renderDetailChapterWindow();
  }

  function getCurrentChapterIndex() {
    if (!state.currentNovel || !state.currentChapter) {
      return -1;
    }
    return state.currentNovel.chapters.findIndex(function(item) {
      return item.url === state.currentChapter.url;
    });
  }

  function saveChapterProgress(ratio) {
    if (state.restoringProgress || !state.currentChapter || !state.currentChapter.url) {
      return;
    }
    state.data.progressByChapter = state.data.progressByChapter || {};
    state.data.progressByChapter[state.currentChapter.url] = {
      ratio: ratio,
      timestamp: Date.now()
    };
    if (state.data.lastNovel && state.currentChapter) {
      state.data.lastNovel.progress = ratio;
    }
    updateFavoriteProgress(ratio);
    saveData();
  }

  function restoreChapterProgress(chapterUrl) {
    var scroller = document.getElementById('reader-scroll');
    var saved = getSavedProgress(chapterUrl);
    if (!saved) {
      state.restoringProgress = false;
      return;
    }
    state.restoringProgress = true;
    setTimeout(function() {
      var max = Math.max(scroller.scrollHeight - scroller.clientHeight, 1);
      scroller.scrollTop = Math.round(max * saved);
      updateReaderProgress(scroller.scrollTop);
      state.restoringProgress = false;
    }, 250);
  }

  function getSavedProgress(chapterUrl) {
    var progress = state.data.progressByChapter || {};
    return progress[chapterUrl] ? progress[chapterUrl].ratio : 0;
  }

  function getProgressLabel(chapterUrl) {
    var progress = getSavedProgress(chapterUrl);
    return progress ? (Math.round(progress * 100) + '% read') : shortChapterSlug(chapterUrl);
  }

  function getFavoriteContinueLabel(item) {
    if (!item.chapterUrl) {
      return 'Open novel';
    }
    var progress = typeof item.progress === 'number' ? item.progress : getSavedProgress(item.chapterUrl);
    var label = item.chapterTitle || 'Continue saved chapter';
    if (progress) {
      label += ' - ' + Math.round(progress * 100) + '% read';
    }
    return label;
  }

  function getFavoriteResumeMeta(item) {
    var progress = typeof item.progress === 'number' ? item.progress : getSavedProgress(item.chapterUrl);
    return progress ? (Math.round(progress * 100) + '%') : 'Saved';
  }

  function updateFavoriteProgress(progress) {
    if (!state.currentNovel || !state.currentNovel.url || !state.currentChapter || !state.currentChapter.url) {
      return;
    }
    var favorites = state.data.favorites || [];
    var index = favorites.findIndex(function(item) {
      return item.url === state.currentNovel.url;
    });
    if (index === -1) {
      return;
    }
    favorites[index] = Object.assign({}, favorites[index], {
      title: state.currentNovel.title,
      url: state.currentNovel.url,
      chapterTitle: state.currentChapter.title,
      chapterUrl: state.currentChapter.url,
      progress: progress || 0,
      updatedAt: Date.now()
    });
    state.data.favorites = favorites;
  }

  function findChapterByUrl(url) {
    if (!state.currentNovel || !state.currentNovel.chapters) {
      return null;
    }
    return state.currentNovel.chapters.find(function(item) {
      return item.url === url;
    }) || null;
  }

  function getSavedChapterIndex(novel) {
    var favorite = (state.data.favorites || []).find(function(item) {
      return item.url === novel.url && item.chapterUrl;
    });
    var savedUrl = favorite ? favorite.chapterUrl : (
      state.data.lastNovel && state.data.lastNovel.url === novel.url
        ? state.data.lastNovel.chapterUrl
        : ''
    );
    if (!savedUrl) {
      return 0;
    }
    var index = (novel.chapters || []).findIndex(function(item) {
      return item.url === savedUrl;
    });
    return index === -1 ? 0 : index;
  }

  function applyChapterNeighbors(chapter) {
    if (!state.currentNovel || !state.currentNovel.chapters) {
      return;
    }

    var chapters = state.currentNovel.chapters;
    var index = chapters.findIndex(function(item) {
      return item.url === chapter.url;
    });

    if (index === -1) {
      return;
    }

    if (!chapter.prevUrl && chapters[index - 1]) {
      chapter.prevUrl = chapters[index - 1].url;
    }
    if (!chapter.nextUrl && chapters[index + 1]) {
      chapter.nextUrl = chapters[index + 1].url;
    }
  }

  function setQuery(value) {
    document.getElementById('search-input').value = cleanWhitespace(value).slice(0, 48);
    updateQueryPreview();
  }

  function appendQueryChar(value) {
    var input = document.getElementById('search-input');
    var next = (input.value + value).replace(/\s+/g, ' ').slice(0, 48);
    input.value = next;
    updateQueryPreview();
  }

  function deleteQueryChar() {
    var input = document.getElementById('search-input');
    input.value = input.value.slice(0, -1);
    updateQueryPreview();
  }

  function updateQueryPreview() {
    var input = document.getElementById('search-input');
    var preview = document.getElementById('query-preview');
    var searchKeys = Array.from(document.querySelectorAll('[data-action="run-search"]'));
    if (!input || !preview) {
      return;
    }
    var value = input.value.trim();
    preview.textContent = value || 'Type with the keypad';
    preview.classList.toggle('is-empty', !value);
    searchKeys.forEach(function(button) {
      button.classList.toggle('is-ready', Boolean(value));
    });
  }

  function onScreenEnter(screenId) {
    if (screenId === 'home') {
      renderResults();
      renderResume();
      renderRecent();
      renderFavorites();
      updateQueryPreview();
    }
    if (screenId === 'chapter-picker') {
      renderChapterPicker();
    }
    if (screenId === 'detail') {
      renderDetailChapterWindow();
    }
    if (screenId === 'reader') {
      setFocusMode(state.focusMode);
    }
    if (screenId === 'reader-settings') {
      renderReaderSettings();
    }
  }

  function setupEvents() {
    document.addEventListener('click', function(event) {
      var actionEl = event.target.closest('[data-action]');
      if (actionEl) {
        handleAction(actionEl.dataset.action, actionEl);
      }
    });

    document.addEventListener('keydown', function(event) {
      var isEditableInput = document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

      if (isEditableInput && document.activeElement.readOnly) {
        isEditableInput = false;
      }

      if (isEditableInput && !['Escape', 'Enter'].includes(event.key)) {
        return;
      }

      switch (event.key) {
        case 'ArrowUp':
          if (state.currentScreen === 'reader') {
            scrollReader('up');
          } else {
            moveFocus('up');
          }
          event.preventDefault();
          break;
        case 'ArrowDown':
          if (state.currentScreen === 'reader') {
            scrollReader('down');
          } else {
            moveFocus('down');
          }
          event.preventDefault();
          break;
        case 'ArrowLeft':
          if (state.currentScreen === 'reader') {
            moveReaderControlFocus('left');
          } else {
            moveFocus('left');
          }
          event.preventDefault();
          break;
        case 'ArrowRight':
          if (state.currentScreen === 'reader') {
            moveReaderControlFocus('right');
          } else {
            moveFocus('right');
          }
          event.preventDefault();
          break;
        case 'Enter':
          if (isEditableInput) {
            var submitAction = document.activeElement.dataset.submitAction;
            if (submitAction) {
              handleAction(submitAction, document.activeElement);
            }
          } else if (document.activeElement && document.activeElement.classList.contains('focusable')) {
            document.activeElement.click();
          }
          event.preventDefault();
          break;
        case 'Escape':
          navigateBack();
          event.preventDefault();
          break;
      }
    });

    var scroller = document.getElementById('reader-scroll');
    scroller.addEventListener('scroll', function() {
      updateReaderProgress(scroller.scrollTop);
    });
  }

  function init() {
    var environment = setupEnvironment();
    renderReleaseBadge(environment);
    collectScreens();
    setupEvents();
    loadData();
    applyReaderSettings();
    renderResults();
    renderResume();
    renderRecent();
    renderFavorites();
    updateQueryPreview();
    setTimeout(function() {
      navigateTo('home', { addToHistory: false });
    }, 100);
    registerServiceWorker();
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return;
    }
    navigator.serviceWorker.register('./sw.js').catch(function(error) {
      console.warn('[ServiceWorker] Registration failed', error);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
