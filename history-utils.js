function filterHistory(history, query = '') {
  const normalized = query.trim().toLowerCase();
  return history.filter((item) => `${item.title} ${item.text}`.toLowerCase().includes(normalized));
}
function addHistory(history, text, date = 'Just now') {
  const title = text.split(/[.!?]/)[0].trim().slice(0, 30) || 'Untitled dictation';
  return [{ title, text, date, color: 'purple' }, ...history].slice(0, 20);
}
function deleteHistory(history, index) {
  return history.filter((_, itemIndex) => itemIndex !== index);
}
function serializeHistory(history, format) {
  if (format === 'json') return JSON.stringify(history, null, 2);
  return history.map((item) => `${item.title}\n${item.date}\n\n${item.text}`).join('\n\n---\n\n');
}
module.exports = { filterHistory, addHistory, deleteHistory, serializeHistory };
