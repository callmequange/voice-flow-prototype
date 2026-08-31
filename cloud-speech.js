/**
 * Browser-facing client for a server-side cloud transcription endpoint.
 * Keep provider credentials on the server; this module only sends audio.
 */
async function transcribeAudio({
  audio,
  endpoint = '/api/transcribe',
  language = 'en-US',
  model = 'scribe_v2',
  fetchImpl = globalThis.fetch,
}) {
  if (!(audio instanceof Blob)) throw new TypeError('audio must be a Blob');
  if (typeof fetchImpl !== 'function') throw new Error('Fetch is unavailable');

  const form = new FormData();
  form.append('file', audio, audio.name || 'recording.webm');
  const elevenLabs = endpoint.includes('elevenlabs');
  form.append(elevenLabs ? 'language_code' : 'language', language);
  if (model) form.append(elevenLabs ? 'model_id' : 'model', model);

  const response = await fetchImpl(endpoint, { method: 'POST', body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || payload.error || `Transcription failed (${response.status})`);
  }
  const text = payload.text || payload.transcript || payload.result?.text;
  if (typeof text !== 'string') throw new Error('Transcription response did not contain text');
  return { text, raw: payload };
}

if (typeof module !== 'undefined') module.exports = { transcribeAudio };
