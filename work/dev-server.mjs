import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..', 'novel-browser');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

const popularNovels = [
  { title: 'Shadow Slave', url: 'http://readnovelfull.com/shadow-slave.html' },
  { title: 'Martial Peak', url: 'http://readnovelfull.com/martial-peak.html' },
  { title: 'Supreme Magus', url: 'http://readnovelfull.com/supreme-magus.html' },
  { title: 'Lord of the Mysteries', url: 'http://readnovelfull.com/lord-of-the-mysteries.html' },
  { title: 'Reincarnation Of The Strongest Sword God', url: 'http://readnovelfull.com/reincarnation-of-the-strongest-sword-god.html' }
];

const stopWords = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'is', 'of', 'on', 'or', 'the', 'to', 'with']);

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');

  if (requestUrl.pathname.startsWith('/api/')) {
    await handleApi(requestUrl, res);
    return;
  }

  const urlPath = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const safePath = path.normalize(urlPath).replace(/^([.][.][\\/])+/, '');
  const filePath = path.join(root, safePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
});

async function handleApi(requestUrl, res) {
  try {
    if (requestUrl.pathname === '/api/search') {
      const query = cleanText(requestUrl.searchParams.get('q') || '');
      const results = await searchNovels(query);
      sendJson(res, 200, { results });
      return;
    }

    if (requestUrl.pathname === '/api/novel') {
      const url = normalizeReadNovelUrl(requestUrl.searchParams.get('url') || '');
      const markdown = await fetchMarkdown(url);
      const novel = parseNovel(markdown, url);
      try {
        const html = await fetchSourceHtml(url);
        const novelId = match(html, /data-novel-id=["'](\d+)["']/i) || match(html, /novel_sYchxZwqM9/i);
        const archive = await fetchChapterArchive(novelId);
        const archiveChapters = parseChapterArchiveHtml(archive);
        if (archiveChapters.length) {
          novel.chapters = archiveChapters;
        }
        const description = match(html, /<div class=["']desc-text["'][^>]*>([\s\S]*?)<\/div>/i);
        if (description) {
          novel.description = htmlToText(description).slice(0, 520);
        }
      } catch {}
      sendJson(res, 200, novel);
      return;
    }

    if (requestUrl.pathname === '/api/chapter') {
      const url = normalizeReadNovelUrl(requestUrl.searchParams.get('url') || '');
      try {
        const html = await fetchSourceHtml(url);
        sendJson(res, 200, parseChapterHtml(html, url));
      } catch {
        const markdown = await fetchMarkdown(url);
        sendJson(res, 200, parseChapter(markdown, url));
      }
      return;
    }

    sendJson(res, 404, { error: 'Unknown API route' });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Request failed' });
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(payload));
}

async function searchNovels(query) {
  if (!query) {
    return popularNovels;
  }

  const seenUrls = new Set();
  const seenTitles = new Set();
  const results = [];

  function add(item) {
    if (!item.title || !item.url) {
      return;
    }
    const title = stripReadNovelTitle(item.title || '');
    const url = normalizeReadNovelUrl(item.url || '');
    const urlKey = canonicalNovelUrl(url);
    const titleKey = canonicalTitle(title);
    if (!title || seenUrls.has(urlKey) || seenTitles.has(titleKey)) {
      return;
    }
    const score = scoreTitle(title, query);
    if (score <= 0) {
      return;
    }
    seenUrls.add(urlKey);
    seenTitles.add(titleKey);
    results.push({ title, url, meta: item.meta || '', score });
  }

  popularNovels
    .filter((item) => scoreTitle(item.title, query) > 0)
    .forEach(add);

  const slug = slugify(query);
  const directCandidates = [
    `http://readnovelfull.com/${slug}.html`,
    `http://readnovelfull.com/${slug}-v1.html`
  ];

  for (const url of directCandidates) {
    if (results.length >= 8) {
      break;
    }
    try {
      const markdown = await fetchMarkdown(url);
      const parsed = parseNovel(markdown, url);
      if (parsed.title && !/not found/i.test(parsed.title)) {
        add({ title: parsed.title, url: parsed.url, meta: parsed.author });
      }
    } catch {}
  }

  const searchUrl = `http://readnovelfull.com/novel-list/search?keyword=${encodeURIComponent(query)}`;
  try {
    const html = await fetchSourceHtml(searchUrl);
    parseNovelLinksFromHtml(html)
      .sort((a, b) => scoreTitle(b.title, query) - scoreTitle(a.title, query))
      .slice(0, 12)
      .forEach(add);
  } catch {}

  try {
    const listMarkdown = await fetchMarkdown(searchUrl);
    parseNovelLinks(listMarkdown)
      .sort((a, b) => scoreTitle(b.title, query) - scoreTitle(a.title, query))
      .slice(0, 12)
      .forEach(add);
  } catch {}

  return results
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 12)
    .map(({ score, ...item }) => item);
}

function parseNovel(markdown, sourceUrl) {
  const lines = markdown.split(/\r?\n/).map(cleanText).filter(Boolean);
  const links = parseMarkdownLinks(markdown);
  const chapters = links
    .filter((link) => /\/chapter-[^)\s]+\.html$/i.test(link.url) && /^Chapter\s+/i.test(link.title))
    .filter(uniqueByUrl)
    .sort((a, b) => chapterNumber(a.title) - chapterNumber(b.title))
    .slice(0, 250);

  const title =
    match(markdown, /## Novel info[\s\S]*?###\s+(.+?)\n/i) ||
    match(markdown, /# Read\s+(.+?)\s+novel/i) ||
    match(markdown, /Title:\s+(.+?)\n/i) ||
    'Novel';

  const author = valueAfterHeading(lines, 'Author:') || 'Author unavailable';
  const genres = valuesAfterHeadingLinks(markdown, 'Genre:') || 'Genres unavailable';
  const rating = match(markdown, /Rating:\s+\*\*([0-9.]+)\*\*\s+\/\s+10/i) || '--';
  const description = extractDescription(lines);

  return {
    title: stripReadNovelTitle(title),
    author,
    genres,
    rating,
    description: description || 'No description was available from the source page.',
    chapters,
    url: sourceUrl
  };
}

function parseChapter(markdown, sourceUrl) {
  const lines = markdown.split(/\r?\n/).map(cleanText).filter(Boolean);
  const title =
    match(markdown, /###\s+(Chapter[^\n]+)/i) ||
    match(markdown, /Title:\s+Read\s+.+?\s+(Chapter[^\n]+?)\s+online/i) ||
    'Chapter';
  const start = lines.findIndex((line) => /^###\s*Chapter/i.test(line) || /^Chapter\s+\d+/i.test(line));
  const end = lines.findIndex((line) => /^(Tip:|ReadNovelFull\.Com|Contact -|Comments)$/i.test(line));
  const body = lines
    .slice(start === -1 ? 0 : start + 1, end === -1 ? lines.length : end)
    .filter((line) => !/^\*\s+\[/.test(line))
    .filter((line) => !/^ReadNovelFull\.(me|com)/i.test(line))
    .filter((line) => !/^Title:/i.test(line))
    .filter((line) => !/^URL Source:/i.test(line))
    .filter((line) => !/^Markdown Content:/i.test(line))
    .map((line) => line.replace(/^#+\s*/, ''));

  const prevUrl = match(markdown, /\[Prev Chapter\]\((http:\/\/readnovelfull\.com\/[^)]+)\)/i);
  const nextUrl = match(markdown, /\[Next Chapter\]\((http:\/\/readnovelfull\.com\/[^)]+)\)/i);

  return {
    title: cleanText(title),
    paragraphs: body,
    prevUrl,
    nextUrl,
    url: sourceUrl
  };
}

function parseChapterHtml(html, sourceUrl) {
  const title = collapseRepeatedTitle(
    htmlToText(match(html, /<h[1-4][^>]*class=["'][^"']*chapter-title[^"']*["'][^>]*>([\s\S]*?)<\/h[1-4]>/i)) ||
    htmlToText(match(html, /<title>\s*Read\s+(.+?)\s+online\s+free/i)) ||
    htmlToText(match(html, /<h[1-4][^>]*>([\s\S]*?Chapter[\s\S]*?)<\/h[1-4]>/i)) ||
    'Chapter'
  );
  const content =
    match(html, /<div[^>]*id=["']chr-content["'][^>]*>([\s\S]*?)<\/div>\s*<div/i) ||
    match(html, /<div[^>]*class=["'][^"']*chapter-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  const paragraphs = extractParagraphsFromHtml(content || html);
  const prevUrl = normalizeOptionalReadNovelUrl(
    match(html, /<a[^>]*(?:id=["']prev_chap["']|rel=["']prev["'])[^>]*href=["']([^"']+)["']/i) ||
    match(html, /<a[^>]*href=["']([^"']+)["'][^>]*>\s*Prev Chapter\s*<\/a>/i)
  );
  const nextUrl = normalizeOptionalReadNovelUrl(
    match(html, /<a[^>]*(?:id=["']next_chap["']|rel=["']next["'])[^>]*href=["']([^"']+)["']/i) ||
    match(html, /<a[^>]*href=["']([^"']+)["'][^>]*>\s*Next Chapter\s*<\/a>/i)
  );

  return {
    title,
    paragraphs,
    prevUrl,
    nextUrl,
    url: sourceUrl
  };
}

function extractParagraphsFromHtml(html) {
  const paragraphs = [];
  const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let found;
  while ((found = paragraphRegex.exec(html))) {
    const text = htmlToText(found[1]);
    if (isReadableChapterLine(text)) {
      paragraphs.push(text);
    }
  }
  if (paragraphs.length) {
    return paragraphs;
  }
  return htmlToText(html)
    .split(/\n+|(?<=\.)\s{2,}/)
    .map(cleanText)
    .filter(isReadableChapterLine);
}

function isReadableChapterLine(line) {
  return line &&
    line.length > 1 &&
    !/^(Prev Chapter|Next Chapter|Tip:|Comments|Report chapter)$/i.test(line) &&
    !/^ReadNovelFull\.(me|com)/i.test(line);
}

function collapseRepeatedTitle(value) {
  const title = cleanText(value);
  const midpoint = Math.floor(title.length / 2);
  if (title.length % 2 === 0 && title.slice(0, midpoint) === title.slice(midpoint)) {
    return cleanText(title.slice(0, midpoint));
  }
  const words = title.split(' ');
  if (words.length % 2 === 0) {
    const half = words.length / 2;
    if (words.slice(0, half).join(' ') === words.slice(half).join(' ')) {
      return words.slice(0, half).join(' ');
    }
  }
  return title;
}

async function fetchMarkdown(sourceUrl) {
  const url = `https://r.jina.ai/http://${sourceUrl.replace(/^https?:\/\//i, '')}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'NovelBrowserLocal/1.0' }
  });
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status}`);
  }
  return await response.text();
}

async function fetchSourceHtml(sourceUrl) {
  const response = await fetch(sourceUrl, {
    headers: { 'User-Agent': 'NovelBrowserLocal/1.0' }
  });
  if (!response.ok) {
    throw new Error(`Source fetch failed: ${response.status}`);
  }
  return await response.text();
}

async function fetchChapterArchive(novelId) {
  if (!novelId || !/^\d+$/.test(String(novelId))) {
    return '';
  }
  const response = await fetch(`https://readnovelfull.com/ajax/chapter-archive?novelId=${novelId}`, {
    headers: { 'User-Agent': 'NovelBrowserLocal/1.0' }
  });
  if (!response.ok) {
    throw new Error(`Archive fetch failed: ${response.status}`);
  }
  return await response.text();
}

function parseChapterArchiveHtml(html) {
  const chapters = [];
  const regex = /<a\s+href=["']([^"']+)["'][^>]*title=["']([^"']+)["'][^>]*>/gi;
  let found;
  while ((found = regex.exec(html))) {
    if (/\/chapter-[^"']+\.html$/i.test(found[1])) {
      chapters.push({
        title: htmlToText(found[2]),
        url: normalizeReadNovelUrl(found[1])
      });
    }
  }
  return chapters.filter(uniqueByUrl).sort((a, b) => chapterNumber(a.title) - chapterNumber(b.title));
}

function parseNovelLinks(markdown) {
  return parseMarkdownLinks(markdown)
    .filter((link) => /^http:\/\/readnovelfull\.com\/[^/]+\.html$/i.test(link.url))
    .map((link) => ({ title: stripReadNovelTitle(link.title), url: link.url }))
    .filter(uniqueByUrl);
}

function parseNovelLinksFromHtml(html) {
  const links = [];
  const regex = /<a\s+[^>]*href=["']([^"']+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let found;
  while ((found = regex.exec(html))) {
    const url = normalizeReadNovelUrl(found[1]);
    if (/\/chapter-[^/]+\.html$/i.test(url)) {
      continue;
    }
    const title = stripReadNovelTitle(htmlToText(found[2]));
    if (title) {
      links.push({ title, url });
    }
  }
  return links.filter(uniqueByCanonicalUrl);
}

function parseMarkdownLinks(markdown) {
  const links = [];
  const regex = /\[([^\]]+)\]\((http:\/\/readnovelfull\.com\/[^)\s"]+)/gi;
  let found;
  while ((found = regex.exec(markdown))) {
    links.push({
      title: cleanText(found[1]).replace(/^Image\s+\d+:\s*/i, ''),
      url: found[2]
    });
  }
  return links;
}

function extractDescription(lines) {
  const start = lines.findIndex((line) => /\[Description\]\(http:\/\/readnovelfull\.com\/[^)]+#tab-description\)/i.test(line) || line === 'Description');
  const firstChapter = lines.findIndex((line) => /^\*\s+\[Chapter\s+/i.test(line));
  const commentTab = lines.findIndex((line, index) => index > start && /\[Comments\]/i.test(line));
  const fallbackStart = lines.findIndex((line) => line.length > 80 && !/^\*\s+\[/.test(line));
  const from = commentTab !== -1 ? commentTab + 1 : (start !== -1 ? start + 1 : Math.max(fallbackStart, 0));
  const to = firstChapter !== -1 ? firstChapter : Math.min(lines.length, from + 6);
  return lines.slice(from, to)
    .filter((line) => !/^\*\s+\[/.test(line))
    .filter((line) => line.length > 30)
    .join(' ')
    .slice(0, 520);
}

function valueAfterHeading(lines, heading) {
  const index = lines.findIndex((line) => line.replace(/^\*\s+/, '') === `### ${heading}` || line === `### ${heading}`);
  if (index === -1) {
    return '';
  }
  const next = lines.slice(index + 1).find((line) => /\[.+\]\(/.test(line) || /^[A-Za-z]/.test(line));
  return next ? cleanText(next.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')) : '';
}

function valuesAfterHeadingLinks(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const found = markdown.match(new RegExp(`### ${escaped}[\\s\\S]*?(?:\\*\\s+###|\\[READ NOW\\]|Latest chapter)`, 'i'));
  if (!found) {
    return '';
  }
  return Array.from(found[0].matchAll(/\[([^\]]+)\]\(http:\/\/readnovelfull\.com\/genres\/[^)]+\)/gi))
    .map((item) => item[1])
    .join(', ');
}

function normalizeReadNovelUrl(value) {
  if (!value) {
    throw new Error('Missing URL');
  }
  const absolute = value.startsWith('/') ? `http://readnovelfull.com${value}` : value;
  const url = absolute.replace(/^https:/i, 'http:');
  if (!/^http:\/\/readnovelfull\.com\//i.test(url)) {
    throw new Error('Only readnovelfull.com URLs are supported');
  }
  return url;
}

function normalizeOptionalReadNovelUrl(value) {
  if (!value) {
    return '';
  }
  try {
    return normalizeReadNovelUrl(value);
  } catch {
    return '';
  }
}

function htmlToText(value) {
  return cleanText(String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&mdash;/g, '-'));
}

function cleanText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripReadNovelTitle(value) {
  return cleanText(value)
    .replace(/^Read\s+/i, '')
    .replace(/\s+novel\s+online\s+free.*$/i, '')
    .replace(/\s+-\s+ReadNovelFull.*$/i, '');
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[':]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function scoreTitle(title, query) {
  const normalizedTitle = normalizeComparable(title);
  const normalizedQuery = normalizeComparable(query);
  const tokens = queryTokens(query);
  if (!tokens.length) {
    return 0;
  }
  if (normalizedTitle === normalizedQuery) {
    return 1000;
  }
  if (normalizedTitle.startsWith(normalizedQuery)) {
    return 850;
  }
  if (normalizedTitle.includes(normalizedQuery)) {
    return 750;
  }

  const hits = tokens.filter((token) => normalizedTitle.includes(token)).length;
  if (!hits) {
    return 0;
  }
  const coverage = hits / tokens.length;
  if (tokens.length >= 3 && coverage < 0.75) {
    return 0;
  }
  if (tokens.length >= 2 && coverage < 0.67) {
    return 0;
  }
  return Math.round(coverage * 100) + hits;
}

function queryTokens(query) {
  return normalizeComparable(query)
    .split(' ')
    .filter((token) => token && !stopWords.has(token));
}

function normalizeComparable(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function canonicalTitle(value) {
  return normalizeComparable(stripReadNovelTitle(value));
}

function canonicalNovelUrl(value) {
  return normalizeReadNovelUrl(value)
    .replace(/^http:\/\/readnovelfull\.com\//i, '')
    .replace(/\.html(?:[?#].*)?$/i, '')
    .replace(/\/+$/g, '')
    .toLowerCase();
}

function chapterNumber(title) {
  const found = String(title || '').match(/Chapter\s+(\d+)/i);
  return found ? Number(found[1]) : Number.MAX_SAFE_INTEGER;
}

function uniqueByUrl(item, index, list) {
  return list.findIndex((other) => other.url === item.url) === index;
}

function uniqueByCanonicalUrl(item, index, list) {
  return list.findIndex((other) => canonicalNovelUrl(other.url) === canonicalNovelUrl(item.url)) === index;
}

function match(value, regex) {
  const found = value.match(regex);
  return found ? cleanText(found[1]) : '';
}

const port = Number(process.env.PORT || 4199);

server.listen(port, '127.0.0.1', () => {
  console.log(`Novel browser preview at http://127.0.0.1:${port}`);
});
