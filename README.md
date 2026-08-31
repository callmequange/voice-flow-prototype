# Voiceflow

Voiceflow is a lightweight macOS-inspired voice-to-text prototype modeled after tools such as Typeless and Wispr Flow. It provides a focused dictation workspace with live speech recognition, transcript history, search, export, and quick AI-style text transformations.

> [!NOTE]
> This is a browser prototype. Native macOS global shortcuts, system-wide text insertion, and cloud transcription are not included yet.

## Features

- **Web Speech API dictation** with continuous and interim transcript updates
- **Recording states** for listening, errors, permissions, and unsupported browsers
- **Persistent history** stored locally with `localStorage`
- **History search** across transcript titles and content
- **Transcript management** with load and delete actions
- **Export** filtered history as JSON or plain text
- **Text transformations** for polishing, summarizing, and creating bullets
- **Workspace, library, and settings** views
- Responsive desktop-style UI with no runtime dependencies

## Project structure

```text
index.html             Prototype entry point
styles.css             UI styling and responsive layout
app.js                 Browser interactions and Speech API integration
history-utils.js       Pure history and export helpers
history-utils.test.js  Unit tests
package.json           Test script configuration
```

## Requirements

- Node.js 18 or newer for running tests
- A browser supporting `SpeechRecognition` or `webkitSpeechRecognition`
- Microphone permission

Chrome and Edge provide the most consistent Web Speech API support. Use `localhost` rather than opening `index.html` directly so browser permissions and clipboard access work reliably.

## Run the prototype

Start a local static server:

```bash
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000), grant microphone permission, and click the microphone button to dictate.

To run the transcription proxy, configure the provider URL and key on the server process:

```bash
TRANSCRIPTION_PROVIDER_URL=https://provider.example/transcribe \
TRANSCRIPTION_PROVIDER_KEY={{TRANSCRIPTION_PROVIDER_KEY}} \
npm start
```

The browser sends multipart audio to `/api/transcribe`; the server forwards it with the secret key and returns the provider response.

## Run tests

Install is not required; the project uses Node's built-in test runner:

```bash
npm test
```

The test suite covers:

- Case-insensitive filtering by title and transcript content
- Adding transcripts and enforcing the 20-item history limit
- Deleting history entries without mutating the source list
- JSON and plain-text export serialization

## Data and privacy

Transcript history is stored in the browser's local storage for the current origin. The prototype does not upload audio or transcripts to a backend. Clearing site data removes saved history.
