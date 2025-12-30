function splitWords(input) {
  const value = String(input || '');
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!spaced) {
    return [];
  }

  return spaced.split(' ');
}

function capitalize(word) {
  if (!word) {
    return '';
  }
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

const TRANSFORMS = {
  kebab(value) {
    return splitWords(value).map((word) => word.toLowerCase()).join('-');
  },
  snake(value) {
    return splitWords(value).map((word) => word.toLowerCase()).join('_');
  },
  camel(value) {
    const words = splitWords(value);
    if (words.length === 0) {
      return '';
    }
    return words[0].toLowerCase() + words.slice(1).map(capitalize).join('');
  },
  pascal(value) {
    return splitWords(value).map(capitalize).join('');
  },
  upper(value) {
    return String(value || '').toUpperCase();
  },
  lower(value) {
    return String(value || '').toLowerCase();
  },
  upper_words(value) {
    return splitWords(value).map((word) => word.toUpperCase()).join(' ');
  },
  lower_words(value) {
    return splitWords(value).map((word) => word.toLowerCase()).join(' ');
  },
  constant(value) {
    return splitWords(value).map((word) => word.toUpperCase()).join('_');
  },
};

function applyTransform(value, transform) {
  if (!transform) {
    return String(value ?? '');
  }

  const fn = TRANSFORMS[transform];
  if (!fn) {
    throw new Error(`Unknown transform: ${transform}`);
  }
  return fn(value);
}

export {
  TRANSFORMS,
  applyTransform,
};
