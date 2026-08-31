const $ = (selector) => document.querySelector(selector);
const recorder = $('.recorder');
const recordButton = $('#recordButton');
const recorderLabel = $('#recorderLabel');
const shortcutLabel = $('#shortcutLabel');
const statusText = $('#statusText');
const transcript = $('#transcript');
const toast = $('#toast');
let recording = false;
let finalTranscript = '';
let shortcutActive = false;
const HISTORY_KEY = 'voiceflow-transcript-history';
const starterHistory = [
  { title: 'Project sync notes', text: 'Okay, quick update on the project sync. We’re still on track for the beta launch next Thursday.\n\nThe design team wrapped up the onboarding flow, and engineering is finishing the new workspace permissions today.\n\nLet’s keep the feedback loop tight this week. I’ll share the updated checklist in the channel after this call.', date: 'Today, 9:42 AM', color: 'purple' },
  { title: 'Ideas for launch', text: 'Ideas for launch', date: 'Yesterday, 4:18 PM', color: 'orange' },
  { title: 'Grocery list', text: 'Grocery list', date: 'Aug 28, 11:05 AM', color: 'blue' },
];
let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null') || starterHistory;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
const languageSelect = $('#languageSelect');
const engineSelect = $('#engineSelect');

if (recognition) {
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.onstart = () => {
    recording = true;
    recorder.classList.add('recording');
    recorderLabel.textContent = 'Listening… speak naturally';
    shortcutLabel.innerHTML = 'Click to stop <kbd>⌥ Space</kbd>';
    statusText.textContent = 'Recording in progress';
  };
  recognition.onresult = (event) => {
    let interim = '';
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const phrase = event.results[index][0].transcript;
      if (event.results[index].isFinal) finalTranscript += `${phrase.trim()} `;
      else interim += phrase;
    }
    transcript.innerHTML = `<p>${escapeHtml(`${finalTranscript}${interim}`.trim() || 'Listening…')}</p>`;
  };
  recognition.onerror = (event) => {
    recording = false;
    recorder.classList.remove('recording');
    recorderLabel.textContent = 'Ready when you are';
    shortcutLabel.innerHTML = 'Hold <kbd>⌥ Space</kbd> to dictate';
    statusText.textContent = 'Could not access speech recognition';
    showToast(event.error === 'not-allowed' ? 'Microphone permission is required' : `Speech recognition error: ${event.error}`);
  };
  recognition.onend = () => {
    if (!recording) return;
    recording = false;
    recorder.classList.remove('recording');
    recorderLabel.textContent = 'Ready when you are';
    shortcutLabel.innerHTML = 'Hold <kbd>⌥ Space</kbd> to dictate';
    statusText.textContent = finalTranscript.trim() ? 'Transcribed just now' : 'No speech detected';
    if (finalTranscript.trim()) {
      const completedText = finalTranscript.trim();
      addHistory(completedText);
      renderHistory();
      copyText(completedText).then((copied) => {
        transcript.innerHTML = '<p class="placeholder">Your next thought will appear here.</p>';
        showToast(copied ? 'Transcript copied · input cleared' : 'Transcript finished · input cleared');
      }).catch(() => {
        transcript.innerHTML = '<p class="placeholder">Your next thought will appear here.</p>';
        showToast('Transcript finished · clipboard access denied');
      });
    }
  };
}
languageSelect?.addEventListener('change', () => {
  if (recognition) recognition.lang = languageSelect.value;
  statusText.textContent = `Language set to ${languageSelect.options[languageSelect.selectedIndex].text}`;
  showToast(`Speech language changed to ${languageSelect.options[languageSelect.selectedIndex].text}`);
});
engineSelect?.addEventListener('change', () => {
  if (engineSelect.value === 'cloud') {
    showToast('Cloud engine integration is next');
    engineSelect.value = 'web-speech';
  }
});

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addHistory(text) {
  const title = text.split(/[.!?]/)[0].trim().slice(0, 30) || 'Untitled dictation';
  history.unshift({ title, text, date: 'Just now', color: 'purple' });
  history = history.slice(0, 20);
  saveHistory();
}
function filteredHistory() {
  const query = ($('#historySearch')?.value || '').trim().toLowerCase();
  return history.filter((item) => `${item.title} ${item.text}`.toLowerCase().includes(query));
}
function exportHistory(format) {
  const entries = filteredHistory();
  if (!entries.length) {
    showToast('No transcripts match the current filter');
    return;
  }
  const content = format === 'json'
    ? JSON.stringify(entries, null, 2)
    : entries.map((item) => `${item.title}\n${item.date}\n\n${item.text}`).join('\n\n---\n\n');
  const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `voiceflow-history-${new Date().toISOString().slice(0, 10)}.${format === 'json' ? 'json' : 'txt'}`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(`Exported ${entries.length} transcript${entries.length === 1 ? '' : 's'} as ${format.toUpperCase()}`);
}

function loadHistory(index) {
  const item = history[index];
  if (!item) return;
  $('#pageTitle').textContent = item.title;
  $('.workspace h1').textContent = item.title;
  statusText.textContent = `Saved ${item.date}`;
  transcript.innerHTML = item.text.split('\n\n').map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');
  $('#workspaceView').classList.remove('hidden');
  $('#libraryView').classList.add('hidden');
  $('#settingsView').classList.add('hidden');
  showToast('Loaded from transcript history');
}
function deleteHistory(index) {
  const item = history[index];
  if (!item) return;
  history.splice(index, 1);
  saveHistory();
  renderHistory();
  showToast(`Deleted “${item.title}”`);
}

function renderHistory() {
  const filtered = history.map((item, index) => ({ item, index })).filter(({ item }) => filteredHistory().includes(item));
  $('.recent-list').innerHTML = filtered.length ? filtered.map(({ item, index }, position) => `<button class="recent${position === 0 ? ' active' : ''}" data-history-index="${index}"><span class="recent-dot ${escapeHtml(item.color || 'purple')}"></span><span><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.date)}</small></span><button class="history-delete" data-delete-index="${index}" aria-label="Delete ${escapeHtml(item.title)}">×</button></button>`).join('') : '<p class="empty-history">No transcripts found</p>';
  $('.library-grid').innerHTML = filtered.length ? filtered.map(({ item, index }) => `<button class="library-tile ${escapeHtml(item.color || 'purple')}-tile" data-history-index="${index}">${escapeHtml(item.title)}<small>${escapeHtml(item.date)}</small><span class="library-delete" data-delete-index="${index}" role="button">×</span></button>`).join('') : '<p class="empty-history">No transcripts found</p>';
  document.querySelectorAll('[data-history-index]').forEach((item) => item.addEventListener('click', (event) => {
    if (!event.target.closest('[data-delete-index]')) loadHistory(Number(item.dataset.historyIndex));
  }));
  document.querySelectorAll('[data-delete-index]').forEach((item) => item.addEventListener('click', (event) => {
    event.stopPropagation();
    deleteHistory(Number(item.dataset.deleteIndex));
  }));
}
async function copyText(value) {
  if (!value) return false;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const input = document.createElement('textarea');
  input.value = value;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  return copied;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

recordButton.addEventListener('click', () => {
  if (!recognition) {
    showToast('Web Speech API is not supported in this browser');
    return;
  }
  if (recording) {
    recognition.stop();
    return;
  }
  finalTranscript = '';
  recognition.start();
});

document.addEventListener('keydown', (event) => {
  if (event.altKey && event.code === 'Space' && !shortcutActive) {
    event.preventDefault();
    shortcutActive = true;
    if (!recording) recordButton.click();
  }
});
document.addEventListener('keyup', (event) => {
  if (event.code === 'Space' && shortcutActive) {
    event.preventDefault();
    shortcutActive = false;
    if (recording) recordButton.click();
  }
});

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'bullets') {
      transcript.innerHTML = '<p>• Beta launch remains on track for next Thursday.</p><p>• Design finished the onboarding flow.</p><p>• Engineering is finishing workspace permissions today.</p><p>• Updated checklist will be shared in the channel.</p>';
      showToast('Turned into a clear checklist');
    } else if (action === 'summary') {
      transcript.innerHTML = '<p><strong>Summary:</strong> The beta launch is on track for next Thursday. Design has completed onboarding, while engineering is finalizing workspace permissions. The updated checklist will be shared with the team.</p>';
      showToast('Created a concise summary');
    } else {
      transcript.innerHTML = '<p>Quick update on the project sync: we’re on track for the beta launch next Thursday.</p><p>The design team has wrapped up onboarding, and engineering is finishing workspace permissions today.</p><p>Let’s keep the feedback loop tight this week. I’ll share the updated checklist in the channel after this call.</p>';
      showToast('Polished your writing');
    }
  });
});

renderHistory();
$('#historySearch').addEventListener('input', renderHistory);
$('#exportJson').addEventListener('click', () => exportHistory('json'));
$('#exportText').addEventListener('click', () => exportHistory('text'));

$('#copyButton').addEventListener('click', async () => {
  const copied = await copyText(transcript.innerText);
  showToast(copied ? 'Transcript copied to clipboard' : 'Clipboard access denied');
});

$('#newNote').addEventListener('click', () => {
  if (recording) recognition?.stop();
  $('#pageTitle').textContent = 'Untitled dictation';
  $('.workspace h1').textContent = 'Untitled dictation';
  statusText.textContent = 'Ready to record';
  transcript.innerHTML = '<p class="placeholder">Your next thought will appear here.</p>';
  showToast('Started a fresh dictation');
});

document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => {
    const view = button.dataset.view;
    $('#workspaceView').classList.toggle('hidden', view !== 'workspace');
    $('#libraryView').classList.toggle('hidden', view !== 'library');
    $('#settingsView').classList.toggle('hidden', view !== 'settings');
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === view));
  });
});
