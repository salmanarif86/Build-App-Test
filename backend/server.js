const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Simple CORS for local dev (front-end on a different port)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const DATA_FILE = path.join(__dirname, 'sessions.json');

function readSessions() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeSessions(sessions) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(sessions, null, 2), 'utf8');
}

function createSession({ transcript, aiOutput, mode, tone, length, voice }) {
  const sessions = readSessions();
  const now = new Date().toISOString();
  const id = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const title = (transcript || aiOutput || 'Untitled session').split(/\n/)[0].slice(0, 80);

  const session = {
    id,
    title,
    transcript: transcript || '',
    aiOutput: aiOutput || '',
    mode: mode || 'brainstorm',
    tone: tone || 'neutral',
    length: length || 'medium',
    voice: voice || 'aurora',
    createdAt: now,
    updatedAt: now
  };

  sessions.unshift(session);
  writeSessions(sessions);
  return session;
}

app.post('/api/generate', async (req, res) => {
  const { transcript, mode, tone, length, voice, action } = req.body || {};

  if (!transcript || typeof transcript !== 'string') {
    return res.status(400).json({ error: 'Missing transcript' });
  }

  // In a real deployment you would call an external AI provider here.
  // To keep this template self-contained, we return a deterministic
  // transformation that depends on the requested action.
  let prefix;
  switch (action) {
    case 'summarize':
      prefix = 'Orb summary:\n\n';
      break;
    case 'expand':
      prefix = 'Orb expansion:\n\n';
      break;
    case 'remix':
      prefix = 'Orb remix:\n\n';
      break;
    default:
      prefix = 'Orb response:\n\n';
  }

  const settingsLine =
    `Mode: ${mode || 'brainstorm'} · Tone: ${tone || 'neutral'} · Length: ${length || 'medium'} · Voice: ${voice || 'aurora'}`;

  const outputText = `${prefix}${settingsLine}\n\n${transcript}`;

  res.json({ outputText });
});

app.post('/api/session', (req, res) => {
  const { transcript, aiOutput, mode, tone, length, voice } = req.body || {};
  const session = createSession({ transcript, aiOutput, mode, tone, length, voice });
  res.status(201).json(session);
});

app.get('/api/sessions', (req, res) => {
  const sessions = readSessions();
  res.json(sessions);
});

app.get('/api/session/:id', (req, res) => {
  const { id } = req.params;
  const sessions = readSessions();
  const found = sessions.find(s => s.id === id);
  if (!found) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(found);
});

app.listen(PORT, () => {
  console.log(`AI Orb backend listening on http://localhost:${PORT}`);
});


