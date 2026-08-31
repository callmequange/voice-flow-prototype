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

test('surfaces API errors', async () => {
  await assert.rejects(() => transcribeAudio({
    audio: new Blob(['audio']),
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'Unauthorized' } }) }),
  }), /Unauthorized/);
});
