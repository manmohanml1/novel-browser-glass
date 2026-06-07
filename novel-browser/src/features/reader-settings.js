export function normalizeReaderSettings(settings) {
  var source = settings || {};
  return {
    fontSize: clampNumber(source.fontSize, 16, 14, 22),
    lineSpace: clampNumber(source.lineSpace, 0, -1, 1),
    comfort: source.comfort !== false
  };
}

export function describeLineSpace(value) {
  if (value === -1) {
    return 'Compact';
  }
  if (value === 1) {
    return 'Roomy';
  }
  return 'Normal';
}

export function adjustFontSize(current, delta) {
  return clampNumber(Number(current) + Number(delta || 0), 16, 14, 22);
}

export function adjustLineSpace(current, delta) {
  return clampNumber(Number(current) + Number(delta || 0), 0, -1, 1);
}

export function toggleComfort(settings) {
  var normalized = normalizeReaderSettings(settings);
  return Object.assign({}, normalized, {
    comfort: !normalized.comfort
  });
}

export function getReaderStyleVars(settings) {
  var normalized = normalizeReaderSettings(settings);
  var lineHeight = normalized.lineSpace === -1 ? 1.42 : (normalized.lineSpace === 1 ? 1.72 : 1.55);
  var gap = normalized.lineSpace === -1 ? 8 : (normalized.lineSpace === 1 ? 16 : 12);

  return {
    fontSize: normalized.fontSize + 'px',
    lineHeight: String(lineHeight),
    gap: gap + 'px',
    color: normalized.comfort ? '#fff1d6' : '#edf3ff'
  };
}

function clampNumber(value, fallback, min, max) {
  var numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    numeric = fallback;
  }
  return Math.min(max, Math.max(min, numeric));
}
