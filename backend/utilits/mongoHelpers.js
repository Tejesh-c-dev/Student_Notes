const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toPlain = (doc) => {
  if (!doc) return doc;
  if (Array.isArray(doc)) return doc.map((item) => toPlain(item));
  if (typeof doc.toObject === 'function') {
    return doc.toObject({ virtuals: true });
  }
  return doc;
};

const withPopulatedUser = (doc, fieldName = 'userId') => {
  const plain = toPlain(doc);
  if (!plain || !plain[fieldName]) {
    return plain;
  }

  plain.user = toPlain(plain[fieldName]);
  delete plain[fieldName];
  return plain;
};

module.exports = {
  escapeRegex,
  toPlain,
  withPopulatedUser
};