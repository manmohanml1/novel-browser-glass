import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseChapter,
  parseChapterArchiveHtml,
  parseChapterHtml,
  parseNovel,
  scoreTitle
} from '../novel-browser/src/server/readnovelfull.mjs';

test('scores exact and specific title matches above loose matches', function() {
  assert.equal(scoreTitle('The Sword God of the Universe', 'the sword god'), 850);
  assert.equal(scoreTitle('The Amber Sword', 'the sword god'), 0);
  assert.ok(scoreTitle('Reincarnation Of The Strongest Sword God', 'sword god') > 0);
});

test('parses novel markdown metadata and chapter links', function() {
  const markdown = [
    '## Novel info',
    '### Shadow Slave',
    '* ### Author:',
    '[Guiltythree](http://readnovelfull.com/authors/guiltythree)',
    '### Genre:',
    '[Fantasy](http://readnovelfull.com/genres/fantasy)',
    'Rating: **8.9** / 10',
    '[Description](http://readnovelfull.com/shadow-slave.html#tab-description)',
    'A long enough description for this novel that should be retained by the parser.',
    '* [Chapter 1](http://readnovelfull.com/shadow-slave/chapter-1-nightmare-begins.html)'
  ].join('\n');

  const novel = parseNovel(markdown, 'http://readnovelfull.com/shadow-slave.html');

  assert.equal(novel.title, 'Shadow Slave');
  assert.equal(novel.author, 'Guiltythree');
  assert.equal(novel.genres, 'Fantasy');
  assert.equal(novel.rating, '8.9');
  assert.equal(novel.chapters.length, 1);
});

test('parses source HTML chapters into readable paragraphs and neighbors', function() {
  const html = [
    '<html><head><title>Read Shadow Slave Chapter 1 Nightmare Begins online free</title></head>',
    '<body>',
    '<a id="prev_chap" href="/shadow-slave/chapter-0.html">Prev Chapter</a>',
    '<a id="next_chap" href="/shadow-slave/chapter-2.html">Next Chapter</a>',
    '<div id="chr-content"><p>First paragraph.</p><p>Next Chapter</p><p>Second paragraph.</p></div><div>',
    '</body></html>'
  ].join('');

  const chapter = parseChapterHtml(html, 'http://readnovelfull.com/shadow-slave/chapter-1.html');

  assert.equal(chapter.title, 'Shadow Slave Chapter 1 Nightmare Begins');
  assert.deepEqual(chapter.paragraphs, ['First paragraph.', 'Second paragraph.']);
  assert.equal(chapter.prevUrl, 'http://readnovelfull.com/shadow-slave/chapter-0.html');
  assert.equal(chapter.nextUrl, 'http://readnovelfull.com/shadow-slave/chapter-2.html');
});

test('parses markdown chapter fallback', function() {
  const markdown = [
    '### Chapter 12 The Test',
    'Actual paragraph.',
    'ReadNovelFull.Com should be removed.',
    '[Next Chapter](http://readnovelfull.com/book/chapter-13.html)'
  ].join('\n');

  const chapter = parseChapter(markdown, 'http://readnovelfull.com/book/chapter-12.html');

  assert.equal(chapter.title, 'Chapter 12 The Test');
  assert.deepEqual(chapter.paragraphs, ['Actual paragraph.']);
  assert.equal(chapter.nextUrl, 'http://readnovelfull.com/book/chapter-13.html');
});

test('parses full chapter archive HTML', function() {
  const html = [
    '<a href="/book/chapter-2.html" title="Chapter 2"></a>',
    '<a href="/book/chapter-1.html" title="Chapter 1"></a>'
  ].join('');

  const chapters = parseChapterArchiveHtml(html);

  assert.deepEqual(chapters.map(function(chapter) { return chapter.title; }), ['Chapter 1', 'Chapter 2']);
});
