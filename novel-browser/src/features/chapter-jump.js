export function appendDigit(currentValue, digit) {
  return (String(currentValue || '') + String(digit || ''))
    .replace(/^0+(\d)/, '$1')
    .slice(0, 5);
}

export function findChapterIndexByNumber(chapters, number) {
  var wanted = Number(number);
  if (!Number.isFinite(wanted)) {
    return -1;
  }

  return (chapters || []).findIndex(function(chapter) {
    var found = String(chapter && chapter.title ? chapter.title : '').match(/Chapter\s+(\d+)/i);
    return found && Number(found[1]) === wanted;
  });
}

export function resolveChapterJumpIndex(chapters, number) {
  var exactIndex = findChapterIndexByNumber(chapters, number);
  if (exactIndex !== -1) {
    return exactIndex;
  }

  var count = (chapters || []).length;
  if (!count) {
    return -1;
  }

  return Math.min(count - 1, Math.max(0, Number(number) - 1));
}
