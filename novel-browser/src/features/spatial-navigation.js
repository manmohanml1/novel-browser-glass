export function findNextSpatialItem(items, currentIndex, direction) {
  if (!items.length || currentIndex < 0 || !items[currentIndex]) {
    return -1;
  }

  var current = withCenter(items[currentIndex]);
  var candidates = items.map(function(item, index) {
    return Object.assign({ index: index }, withCenter(item));
  }).filter(function(item) {
    if (item.index === currentIndex) {
      return false;
    }
    if (direction === 'up') {
      return item.cy < current.cy - 2;
    }
    if (direction === 'down') {
      return item.cy > current.cy + 2;
    }
    if (direction === 'left') {
      return item.cx < current.cx - 2;
    }
    if (direction === 'right') {
      return item.cx > current.cx + 2;
    }
    return false;
  });

  if (!candidates.length) {
    return -1;
  }

  candidates.sort(function(a, b) {
    return spatialScore(a, current, direction) - spatialScore(b, current, direction);
  });

  return candidates[0].index;
}

function withCenter(item) {
  return {
    left: item.left,
    top: item.top,
    width: item.width,
    height: item.height,
    cx: item.left + item.width / 2,
    cy: item.top + item.height / 2
  };
}

function spatialScore(item, current, direction) {
  var primary;
  var cross;

  if (direction === 'up' || direction === 'down') {
    primary = Math.abs(item.cy - current.cy);
    cross = Math.abs(item.cx - current.cx);
  } else {
    primary = Math.abs(item.cx - current.cx);
    cross = Math.abs(item.cy - current.cy);
  }

  return primary * 10 + cross;
}
