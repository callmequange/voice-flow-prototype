const test = require('node:test');
const assert = require('node:assert/strict');
const { transcribeAudio } = require('./cloud-speech');

test('posts audio and returns a provider transcript', async () => {
  let request;
  const result = await transcribeAudio({
    audio: new Blob(['audio data'], { type: 'audio/webm' }),
    language: 'zh-CN',
    model: 'fast',
    fetchImpl: async (endpoint, options) => {
      request = { endpoint, options };
      return { ok: true, json: async () => ({ text: '你好，世界' }) };
    },
  });
  assert.equal(result.text, '你好，世界');
  assert.equal(request.endpoint, '/api/transcribe');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.body.get('language'), 'zh-CN');
  assert.equal(request.options.body.get('model'), 'fast');
});

test('uses ElevenLabs field names for ASR requests', async () => {
  let request;
  await transcribeAudio({
    audio: new Blob(['audio']),
    endpoint: 'https://api.elevenlabs.io/v1/speech-to-text',
    fetchImpl: async (_, options) => {
      request = options;
      return { ok: true, json: async () => ({ text: 'hello' }) };
    },
  });
  assert.equal(request.body.get('language_code'), 'en-US');
  assert.equal(request.body.get('model_id'), 'scribe_v2');
});

test('surfaces API errors', async () => {
  await assert.rejects(() => transcribeAudio({
    audio: new Blob(['audio']),
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'Unauthorized' } }) }),
  }), /Unauthorized/);
});
