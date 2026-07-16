const assert = require('assert');
const {
  normalizeTagName,
  filterTagSuggestions,
  buildTagTintStyle,
  formatTagsString,
} = require('./components/ui/tag-input-helpers');

const tags = [
  { id: '1', name: 'VIP', color: '#ff0000' },
  { id: '2', name: 'Priority', color: '#00ff00' },
  { id: '3', name: 'Follow Up', color: '#0000ff' },
];

assert.strictEqual(normalizeTagName('  vip  '), 'vip');
assert.deepStrictEqual(filterTagSuggestions(tags, 'vi'), [tags[0]]);
assert.deepStrictEqual(filterTagSuggestions(tags, 'priority'), [tags[1]]);
assert.deepStrictEqual(filterTagSuggestions(tags, ''), tags);
assert.strictEqual(formatTagsString(['VIP', 'New Tag', '']), 'VIP, New Tag');
assert.deepStrictEqual(buildTagTintStyle('#6366f1'), {
  backgroundColor: 'rgba(99, 102, 241, 0.14)',
  color: '#c7d2fe',
  borderColor: 'rgba(99, 102, 241, 0.18)',
});

console.log('tag-input helper behavior verified');
