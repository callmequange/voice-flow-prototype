const test = require('node:test');
const assert = require('node:assert/strict');
const { filterHistory, addHistory, deleteHistory, serializeHistory } = require('./history-utils');
const history = [
  { title: 'Project sync', text: 'Beta launch next Thursday', date: 'Today' },
  { title: 'Grocery list', text: 'Coffee and apples', date: 'Yesterday' },
];
test('filters by title and content case-insensitively', () => {
  assert.deepEqual(filterHistory(history, 'GROCERY'), [history[1]]);
  assert.deepEqual(filterHistory(history, 'thursday'), [history[0]]);
  assert.deepEqual(filterHistory(history, '  '), history);
});
test('adds newest item and caps history at 20', () => {
  const result = addHistory(history, 'A new idea for launch. More detail follows.');
  assert.equal(result[0].title, 'A new idea for launch');
  assert.equal(addHistory(Array.from({ length: 20 }, (_, index) => ({ title: `${index}`, text: '' })), 'Newest').length, 20);
});
test('deletes selected item without mutating source', () => {
  assert.deepEqual(deleteHistory(history, 0), [history[1]]);
  assert.equal(history.length, 2);
});
test('serializes JSON and readable text', () => {
  const filtered = filterHistory(history, 'project');
  assert.deepEqual(JSON.parse(serializeHistory(filtered, 'json')), [history[0]]);
  assert.equal(serializeHistory(filtered, 'text'), 'Project sync\nToday\n\nBeta launch next Thursday');
});
