const http = require('node:http');

const port = Number(process.env.PORT || 8000);
const providerUrl = process.env.TRANSCRIPTION_PROVIDER_URL;
const providerKey = process.env.TRANSCRIPTION_PROVIDER_KEY;

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  response.end(JSON.stringify(body));
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
    return response.end();
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
        Authorization: `Bearer ${providerKey}`,
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
