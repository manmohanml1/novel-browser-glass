export function findNextGridIndex(currentIndex, itemCount, columns, direction, options = {}) {
  var count = Number(itemCount);
  var cols = Number(columns);
  if (!Number.isFinite(count) || !Number.isFinite(cols) || count <= 0 || cols <= 0) {
    return -1;
  }

  var index = Number(currentIndex);
  if (!Number.isFinite(index) || index < 0 || index >= count) {
    return -1;
  }

  var target = -1;
  if (direction === 'left') {
    target = index > 0 ? index - 1 : (options.wrapHorizontal ? count - 1 : -1);
  } else if (direction === 'right') {
    target = index < count - 1 ? index + 1 : (options.wrapHorizontal ? 0 : -1);
  } else if (direction === 'up') {
    target = index - cols;
  } else if (direction === 'down') {
    target = index + cols;
  }

  return target >= 0 && target < count ? target : -1;
}
