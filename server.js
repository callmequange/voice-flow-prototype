const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = Number(process.env.PORT || 8000);
const publicDir = __dirname;
const staticFiles = {
  '/': { file: 'index.html', type: 'text/html' },
  '/index.html': { file: 'index.html', type: 'text/html' },
  '/styles.css': { file: 'styles.css', type: 'text/css' },
  '/app.js': { file: 'app.js', type: 'text/javascript' },
  '/cloud-speech.js': { file: 'cloud-speech.js', type: 'text/javascript' },
};
const providerUrl = process.env.TRANSCRIPTION_PROVIDER_URL;
const providerKey = process.env.TRANSCRIPTION_PROVIDER_KEY;
const deepSeekKey = process.env.DEEPSEEK_API_KEY;
const deepSeekUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  response.end(JSON.stringify(body));
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
    return response.end();
  }
  if (request.method === 'POST' && request.url === '/api/enhance') {
    if (!deepSeekKey) return send(response, 503, { error: 'DeepSeek enhancement is not configured' });
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    let input;
    try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(response, 400, { error: 'Request body must be valid JSON' }); }
    if (typeof input.text !== 'string' || !input.text.trim()) return send(response, 400, { error: 'text is required' });
    const prompts = {
      polish: 'Polish the transcript for clarity and natural grammar. Preserve meaning and return only the revised text.',
      summary: 'Summarize this transcript in one concise paragraph. Return only the summary.',
      bullets: 'Convert this transcript into a concise bullet list. Return only the bullets.',
    };
    const instruction = prompts[input.action] || prompts.polish;
    try {
      const upstream = await fetch(deepSeekUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deepSeekKey}` },
        body: JSON.stringify({ model: process.env.DEEPSEEK_MODEL || 'deepseek-chat', messages: [{ role: 'system', content: instruction }, { role: 'user', content: input.text }], temperature: 0.2, stream: false }),
      });
      const payload = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return send(response, upstream.status, { error: payload.error?.message || 'DeepSeek request failed' });
      const text = payload.choices?.[0]?.message?.content;
      if (typeof text !== 'string') return send(response, 502, { error: 'DeepSeek response did not contain text' });
      return send(response, 200, { text, action: input.action || 'polish' });
    } catch (error) { return send(response, 502, { error: `DeepSeek unavailable: ${error.message}` }); }
  }
  const asset = staticFiles[request.url];
  if (request.method === 'GET' && asset) {
    return fs.readFile(path.join(publicDir, asset.file), (error, content) => {
      if (error) return send(response, 404, { error: 'Asset not found' });
      response.writeHead(200, { 'Content-Type': `${asset.type}; charset=utf-8`, 'Cache-Control': 'no-cache' });
      response.end(content);
    });
  }
  if (request.method !== 'POST' || request.url !== '/api/transcribe') return send(response, 404, { error: 'Not found' });
  if (!providerUrl || !providerKey) return send(response, 503, { error: 'Transcription provider is not configured' });

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  try {
    const upstream = await fetch(providerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers['content-type'] || 'application/octet-stream',
        ...(providerUrl.includes('elevenlabs') ? { 'xi-api-key': providerKey } : { Authorization: `Bearer ${providerKey}` }),
      },
      body,
    });
    const text = await upstream.text();
    response.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/json', 'Access-Control-Allow-Origin': '*' });
    response.end(text);
  } catch (error) {
    send(response, 502, { error: `Transcription provider unavailable: ${error.message}` });
  }
});

server.listen(port, () => console.log(`Voiceflow server listening on http://localhost:${port}`));
