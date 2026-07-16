function normalizeTagName(value) {
  return value.trim().replace(/\s+/g, " ");
}

function filterTagSuggestions(tags, query, selectedNames = []) {
  const normalizedQuery = normalizeTagName(query).toLowerCase();
  const selectedLookup = new Set(selectedNames.map((name) => normalizeTagName(name).toLowerCase()));

  return tags.filter((tag) => {
    const normalizedName = normalizeTagName(tag.name).toLowerCase();
    if (selectedLookup.has(normalizedName)) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    return normalizedName.includes(normalizedQuery);
  });
}

function hexToRgb(hex) {
  const cleaned = hex.replace("#", "").trim();
  if (cleaned.length !== 3 && cleaned.length !== 6) {
    return null;
  }
  const expanded = cleaned.length === 3 ? cleaned.split("").map((value) => value + value).join("") : cleaned;
  const value = Number.parseInt(expanded, 16);
  if (Number.isNaN(value)) {
    return null;
  }
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function buildTagTintStyle(color) {
  const rgb = hexToRgb(color) ?? { r: 99, g: 102, b: 241 };
  return {
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`,
    color: `rgb(${Math.min(rgb.r + 92, 255)} ${Math.min(rgb.g + 92, 255)} ${Math.min(rgb.b + 92, 255)})`,
    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`,
  };
}

function formatTagsString(tags) {
  return tags.map((tag) => normalizeTagName(tag)).filter(Boolean).join(", ");
}

module.exports = {
  normalizeTagName,
  filterTagSuggestions,
  buildTagTintStyle,
  formatTagsString,
};
