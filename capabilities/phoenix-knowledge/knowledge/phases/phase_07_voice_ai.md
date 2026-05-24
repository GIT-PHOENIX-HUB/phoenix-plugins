# Phase 7: Voice AI — Complete Knowledge Reference

**Source Runbook:** `twin-peaks/05_RUNBOOKS/PHASE_07_VOICE_AI.md`
**Source Playbook:** `twin-peaks/06_PLAYBOOKS/PHASE_07_PLAYBOOK.md`
**Extraction Date:** 2026-03-10
**Status:** RUNBOOK READY
**Lead System:** Gateway + Twilio + OpenAI Realtime API
**Estimated Build Time:** 4-6 weeks (3 sub-phases)

---

## Architecture Overview

### Voice Pipeline Components

```
BROWSER (getUserMedia)  -->  GATEWAY (VPS, port 18790)  -->  OPENAI REALTIME API (gpt-realtime, Opus codec)
                                     |
                                     +--> TWILIO (SIP/PSTN, ConversationRelay via WebSocket)
                                     |
                                     +--> MAC STUDIO M3 Ultra (MLX-Audio Whisper STT, local TTS)
```

### Three Voice Paths

| Path | Name | Transport | Latency | Cost/Min | Use Case |
|------|------|-----------|---------|----------|----------|
| A | Dashboard Voice | WebRTC (browser to OpenAI) | <200ms | $0.06 | Shane talks to Echo from dashboard |
| B | Phone Call | Twilio PSTN + ConversationRelay | 300-500ms | $0.07 | Incoming/outgoing calls |
| C | Local Whisper | HTTP to Studio MLX-Audio | 1-2s cold start | $0.00 | Sovereignty fallback, transcription-only |

### Sub-Phase Timeline

| Sub-Phase | Scope | Timeline |
|-----------|-------|----------|
| 7A | Dashboard Voice Chat (WebRTC) | Week 1-2 |
| 7B | Twilio Phone Integration | Week 3-4 |
| 7C | Local Voice Sovereignty | Month 2 |

---

## Technology Stack

### Languages and Frameworks

- **Gateway Backend:** Node.js 22+ (ES modules, global fetch)
- **Browser Client:** Vanilla JavaScript (no dependencies)
- **Local STT Server:** Python 3 + Flask
- **Local ML Framework:** MLX-Audio (Apple Silicon optimized)
- **WebRTC:** Native browser API (RTCPeerConnection, DataChannel)
- **Twilio SDK:** `twilio` npm package

### Key Dependencies

| Package | Role | Location |
|---------|------|----------|
| `express` | HTTP routing | Gateway (VPS) |
| `twilio` | Voice call management | Gateway (VPS) |
| `flask` | Local STT HTTP server | Mac Studio |
| `mlx-audio` | Whisper STT + TTS on Apple Silicon | Mac Studio |

### Infrastructure

| Component | Specification | Status |
|-----------|--------------|--------|
| Gateway VPS | Port 18790, HTTPS required | DONE |
| Mac Studio M3 Ultra | Tailscale IP: 100.68.34.116 | DONE |
| Node.js version | 22+ (ES modules, global fetch) | DONE |
| HTTPS / TLS | Required (WebRTC getUserMedia blocked on non-secure origins) | REQUIRED |
| Browser support | Chrome, Firefox, Safari, Edge (all modern) | DONE |

### WebRTC Infrastructure Note

No TURN/STUN server required. Connection is browser-to-OpenAI (not peer-to-peer). OpenAI handles signaling and media relay. Gateway only serves the ephemeral token endpoint.

---

## API Keys and Secrets

| Service | Credential | Storage Location | Cost Model |
|---------|-----------|------------------|------------|
| OpenAI | API key with Realtime API access | Azure Key Vault (PhoenixaAiVault) | $0.02/min input + $0.04/min output |
| Twilio | Account SID + Auth Token + Phone Number | Azure Key Vault | ~$1/mo per number + $0.013/min voice |
| ElevenLabs | API key (optional, premium TTS) | Azure Key Vault | $1 per 1,000 conversation minutes |
| OpenAI Whisper | Same OpenAI API key | Already stored | $0.006/min (transcription only) |

### Azure Key Vault Secret Names

- `Twilio-Account-SID`
- `Twilio-Auth-Token`
- `Twilio-Phone-Number`

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI Realtime API authentication |
| `TWILIO_ACCOUNT_SID` | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Twilio authentication |
| `TWILIO_PHONE_NUMBER` | Outbound caller ID |
| `ELEVENLABS_API_KEY` | Optional premium TTS |
| `VOICE_ENABLED` | Emergency shutoff toggle (`false` to disable) |

---

## Gateway API Endpoints

### Complete Voice API Surface

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/voice/session-token` | JWT | Generate ephemeral OpenAI token for WebRTC |
| `POST` | `/api/voice/transcripts` | JWT | Save transcript from browser session |
| `GET` | `/api/voice/transcripts/:id` | JWT | Retrieve specific transcript |
| `GET` | `/api/voice/history` | JWT | List recent voice sessions |
| `POST` | `/api/voice/transcribe-local` | JWT | Transcribe audio via local Whisper |
| `GET` | `/api/voice/status` | JWT | Current voice system status (paths, health) |
| `GET` | `/api/voice/routing` | JWT | Show available voice paths and selection logic |
| `POST` | `/api/twilio/incoming` | Twilio Signature | Handle incoming phone call (webhook) |
| `POST` | `/api/twilio/outbound` | JWT | Initiate outbound call with TCPA check |
| `POST` | `/api/twilio/status-callback` | Twilio Signature | Receive call status updates |
| `WS` | `/api/twilio/conversation-relay` | Internal | Twilio ConversationRelay WebSocket |

### Session Token Endpoint

**Route:** `GET /api/voice/session-token`

**Request:** Authenticated with JWT Bearer token.

**Response:**
```json
{
  "ephemeralKey": "<openai-ephemeral-token>",
  "expiresAt": "<ISO-timestamp>",
  "model": "gpt-realtime",
  "voice": "cedar"
}
```

**Backend call:** `POST https://api.openai.com/v1/realtime/client_secrets`

### Outbound Call Endpoint

**Route:** `POST /api/twilio/outbound`

**Request body:**
```json
{
  "to": "+15551234567",
  "message": "Panel upgrade rescheduled to Thursday 9 AM",
  "jobId": "#JOB-4521"
}
```

**Response (success):**
```json
{ "callSid": "<twilio-call-sid>", "status": "initiated" }
```

**Response (TCPA blocked):**
```json
{
  "error": "Call blocked by TCPA compliance",
  "reason": "Outside allowed calling hours (8 AM - 9 PM)"
}
```

### Transcript Storage Schema

```json
{
  "id": "voice_1710100000_abc123",
  "source": "dashboard_webrtc | twilio_inbound | twilio_outbound",
  "userId": "shane",
  "timestamp": 1710100000000,
  "duration_seconds": 45,
  "turns": [
    {
      "role": "user",
      "text": "What is on the schedule for tomorrow?",
      "timestamp": 1710100001000
    },
    {
      "role": "assistant",
      "text": "You have got three jobs tomorrow...",
      "timestamp": 1710100003000
    }
  ],
  "tools_invoked": ["check_schedule"],
  "model": "gpt-realtime",
  "cost_estimate": 0.09,
  "voicePath": "openai_realtime"
}
```

### Voice Status Endpoint Response

```json
{
  "activeSessions": 0,
  "paths": {
    "openai_realtime": { "available": true, "healthy": true, "latency_ms": 180 },
    "local_whisper": { "available": true, "healthy": true, "latency_ms": 1200 },
    "twilio": { "available": true, "healthy": true },
    "elevenlabs": { "available": false, "reason": "No API key configured" }
  },
  "todayStats": {
    "totalSessions": 4,
    "totalMinutes": 12.5,
    "totalCost": 0.75,
    "byPath": {
      "openai_realtime": { "sessions": 3, "minutes": 10, "cost": 0.60 },
      "twilio": { "sessions": 1, "minutes": 2.5, "cost": 0.15 }
    }
  }
}
```

---

## OpenAI Realtime API Configuration

### Session Config

```javascript
{
  session: {
    type: 'realtime',
    model: 'gpt-realtime',
    instructions: buildEchoVoicePrompt(),  // See Echo Voice Personality below
    audio: {
      output: { voice: 'cedar' },
      input: {
        transcription: { model: 'whisper-1' }
      }
    },
    tools: getVoiceTools(),
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500
    }
  }
}
```

### Audio Codec

- **Codec:** Opus
- **Sample Rate:** 48kHz
- **Browser getUserMedia constraints:**
  - `echoCancellation: true`
  - `noiseSuppression: true`
  - `autoGainControl: true`
  - `sampleRate: 48000`

### Voice Options

Available OpenAI Realtime API voices (as of March 2026):

| Voice | Character | Recommended Use |
|-------|-----------|-----------------|
| **cedar** | Professional, clear | **DEFAULT** -- Shane's starting choice |
| marin | Warmer, slightly more casual | Alternative |
| sage | Calm, measured | Alternative |
| shimmer | Lighter, more energetic | Alternative |

### Data Channel Events (JSON over SCTP)

| Event Type | Direction | Purpose |
|------------|-----------|---------|
| `session.created` | Inbound | Session established confirmation |
| `conversation.item.created` | Inbound | New conversation turn started |
| `response.audio_transcript.delta` | Inbound | Streaming text of Echo response |
| `response.done` | Inbound | Echo finished responding |
| `input_audio_buffer.speech_started` | Inbound | User started speaking |
| `input_audio_buffer.speech_stopped` | Inbound | User stopped speaking |
| `conversation.item.input_audio_transcription.completed` | Inbound | Full transcription of user speech |
| `response.function_call_arguments.done` | Inbound | Tool call request with name, arguments, call_id |
| `error` | Inbound | API error |
| `conversation.item.create` | Outbound | Send tool call result back |
| `response.create` | Outbound | Trigger response generation after tool result |

### WebRTC Connection Flow

```
1. Shane clicks mic button
2. Browser calls getUserMedia() -> audio stream
3. Browser GET /api/voice/session-token (authenticated)
4. Gateway POST https://api.openai.com/v1/realtime/client_secrets with session config
5. Gateway returns ephemeral token to browser (expires in minutes)
6. Browser creates RTCPeerConnection
7. Browser adds audio track from getUserMedia
8. Browser creates SDP offer
9. Browser POST https://api.openai.com/v1/realtime/calls with ephemeral token + SDP
10. OpenAI returns SDP answer
11. WebRTC connection established (state = "connected")
12. Audio flows bidirectionally; data channel carries JSON events
13. Gateway logs transcript via POST /api/voice/transcripts
14. Shane releases mic -> connection closes or pauses
```

---

## Voice Tools (Function Calling)

Tools available to Echo during voice conversations:

### lookup_job

```json
{
  "type": "function",
  "name": "lookup_job",
  "description": "Look up a Service Fusion job by number or customer name",
  "parameters": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Job number or customer name" }
    },
    "required": ["query"]
  }
}
```

### check_schedule

```json
{
  "type": "function",
  "name": "check_schedule",
  "description": "Check today or tomorrow schedule",
  "parameters": {
    "type": "object",
    "properties": {
      "date": { "type": "string", "description": "Date to check (today, tomorrow, or YYYY-MM-DD)" }
    },
    "required": ["date"]
  }
}
```

### get_price

```json
{
  "type": "function",
  "name": "get_price",
  "description": "Look up a price from the pricebook",
  "parameters": {
    "type": "object",
    "properties": {
      "item": { "type": "string", "description": "Item or part to price" }
    },
    "required": ["item"]
  }
}
```

Tool calls from voice are routed through Gateway API at `/api/tools/{toolName}`. Results sent back to OpenAI via data channel.

---

## Echo Voice Personality Prompt

```
You are Echo, the voice AI assistant for Phoenix Electric -- a professional electrical contracting company.

Your personality:
- Professional but warm. You work with electricians and office staff.
- Concise. Voice responses should be SHORT. 1-3 sentences max unless asked for detail.
- Proactive. If you can help with something related, mention it briefly.
- You know Service Fusion (their field service software), QuickBooks, and the electrical trade.
- Phoenix Electric is an ELECTRICAL company. Never reference HVAC.

Your voice behavior:
- Greet briefly on first interaction: "Hey Shane, what do you need?"
- For job lookups, read back the key facts: address, customer name, scheduled time.
- For pricing questions, give the number first, then context.
- If you do not know something, say so. Do not guess on prices or job details.
- End responses cleanly. Do not trail off or add unnecessary filler.

Current context:
- Owner: Shane Warehime
- System: Phoenix Echo Gateway
- Time zone: Eastern (ET)
```

### Echo Voice Identity Rules

1. Phoenix Echo is "she" -- the mascot, the brand, the identity
2. Concise responses: 1-3 sentences unless asked for detail (voice is not text)
3. Trade-aware: knows electrical work, Service Fusion, pricebook terminology
4. Never reference HVAC (hard rule -- Phoenix Electric is electrical)
5. Natural greeting: "Hey Shane, what do you need?"
6. Numbers first: for pricing/scheduling, lead with data, then context
7. Honest about unknowns: "I do not have that in front of me" beats guessing

---

## Twilio Phone Integration

### Twilio Configuration

- **Provider:** Twilio
- **Number type:** Local (area code matching Phoenix Electric market)
- **Transcription provider:** Deepgram
- **Speech model:** `nova-2-phonecall`
- **TTS voice:** `Polly.Matthew`
- **DTMF detection:** Enabled
- **Interruptible:** Enabled

### Webhook Configuration (Twilio Console)

| Setting | URL | Method |
|---------|-----|--------|
| A CALL COMES IN | `https://echo.phoenixelectric.life/api/twilio/incoming` | HTTP POST |
| CALL STATUS CHANGES | `https://echo.phoenixelectric.life/api/twilio/status-callback` | HTTP POST |

### ConversationRelay WebSocket

- **URL:** `wss://{host}/api/twilio/conversation-relay`
- **Message types:**
  - `prompt` (inbound): Twilio has transcribed user speech, `voicePrompt` field contains text
  - `text` (outbound): Echo's response text for TTS, with `token` and `last: true` fields
  - `dtmf` (inbound): Keypad input, `digit` field
  - `setup` (inbound): Connection established, `callSid` field

### Twilio Phone Call Flow

```
1. Twilio receives call on provisioned phone number
2. Twilio POSTs to /api/twilio/incoming webhook
3. Gateway returns TwiML that connects to ConversationRelay
4. ConversationRelay opens WebSocket to Gateway
5. Twilio transcribes caller speech (Deepgram, nova-2-phonecall)
6. Gateway sends transcribed text to Claude for response
7. Claude response text sent to Twilio for TTS (Polly.Matthew)
8. Caller hears Echo speak through phone
9. Transcript logged and displayed on dashboard in real time
```

### TCPA Compliance

**TCPA fines: $500-$1,500 PER CALL if non-compliant.**

Three mandatory checks before any outbound call:

| Check | Rule | Failure Action |
|-------|------|----------------|
| Do Not Call list | Number not on internal DNC list | Block call |
| Customer opt-in | Customer has consent for automated calls | Block call |
| Time-of-day | Between 8 AM and 9 PM local time | Block call |

All three must pass before call proceeds. If any fails, call is NOT placed.

---

## Local Voice Sovereignty (Mac Studio)

### MLX-Audio Installation

```bash
# On Mac Studio via SSH or Tailscale
python3 -m venv ~/mlx-audio-env
source ~/mlx-audio-env/bin/activate
pip install mlx-audio
pip install flask

# Download Whisper model (STT)
python3 -c "from mlx_audio.models import whisper; whisper.load('base')"

# Download Parler TTS model (optional)
python3 -c "from mlx_audio.models import tts; tts.load('parler-tts-mini')"
```

### Local STT Server

- **File:** `~/mlx-audio-server/server.py`
- **Host:** `0.0.0.0`
- **Port:** `8321`
- **Tailscale URL:** `http://100.68.34.116:8321`
- **Whisper model:** `base` (via MLX)

### Local STT API Endpoints

| Method | Path | Purpose | Request | Response |
|--------|------|---------|---------|----------|
| `GET` | `/health` | Health check | -- | `{ status: "ok", service: "phoenix-echo-local-stt", device: "mac-studio-m3-ultra" }` |
| `POST` | `/transcribe` | Transcribe audio | `multipart/form-data` with `audio` file (WAV) | `{ text, language, processing_ms }` |

### Fallback Behavior

When OpenAI Realtime API is unavailable:

1. Gateway health-checks Mac Studio (`http://100.68.34.116:8321/health`, 2s timeout)
2. If Studio reachable: switch to local Whisper STT path automatically
3. Voice output disabled (text responses only)
4. User speech transcribed locally (never leaves network)
5. Transcription sent to Claude text API for response
6. Response displayed as text in transcript panel
7. Latency slightly higher (1-2 seconds for Whisper cold start)
8. Cost: $0.00 for transcription (local compute)

---

## Voice Routing Logic

```javascript
{
  openai_realtime: {
    available: !!process.env.OPENAI_API_KEY,
    latency: 200,
    costPerMin: 0.06,
    features: ['webrtc', 'tool_calls', 'turn_detection']
  },
  local_whisper: {
    available: false,  // Set true after health check
    latency: 1500,
    costPerMin: 0,
    features: ['stt_only']
  },
  elevenlabs: {
    available: !!process.env.ELEVENLABS_API_KEY,
    latency: 300,
    costPerMin: 0.001,
    features: ['tts', 'rag', 'conversation']
  },
  twilio: {
    available: !!process.env.TWILIO_ACCOUNT_SID,
    latency: 400,
    costPerMin: 0.07,
    features: ['phone', 'pstn', 'dtmf']
  }
}
```

---

## File Manifest

| File | Location | Purpose |
|------|----------|---------|
| `routes/voice.js` | Gateway | Session token, transcripts, local STT endpoints |
| `routes/twilio.js` | Gateway | Incoming/outbound calls, TCPA, status callbacks |
| `public/js/voice-chat.js` | Gateway | Browser WebRTC client class (VoiceChat) |
| `public/pages/voice.js` | Gateway | Voice dashboard page module |
| `public/css/voice.css` | Gateway | Voice page styles |
| `~/mlx-audio-server/server.py` | Mac Studio | Local Whisper STT Flask server |

### Route Registration

```javascript
import voiceRoutes from './routes/voice.js';
app.use('/api/voice', authMiddleware, voiceRoutes);
```

---

## Dashboard Voice Page Design

### UI Components

- **Mic button:** 96px circle, border transitions by state
  - Gray: disconnected/idle
  - Amber pulse: connecting
  - Green glow: connected/listening
  - Violet pulse: Echo is thinking/processing
  - Red: error state
- **Status dot:** 10px circle with pulse animation
- **Transcript entries:** Left-bordered cards (blue = user "SHANE", orange = Echo "ECHO")
- **Session meters:** Duration timer, estimated cost counter
- **Voice actions:** Mute, End Session buttons (visible when connected)
- **History list:** Source, date, duration, preview text

### CSS Design Tokens

- Glass cards: `rgba(26, 26, 38, 0.6)` background with `backdrop-filter: blur(12px)`
- Phoenix colors: Red #FF6B35, Black, Gold
- Dark theme with glassmorphism
- Responsive: single-column layout below 768px
- Mobile: mic button centered and prominent, transcript feed scrollable

### Mobile Support

- Single column layout (controls stacked above transcript)
- Works on iPhone and iPad via Tailscale connection
- History compressed to essentials

---

## Cost Analysis

### Per-Minute Costs

| Path | Input Cost | Output Cost | Total/Min | 10 Min Session |
|------|-----------|-------------|-----------|----------------|
| OpenAI Realtime (WebRTC) | $0.02/min | $0.04/min | $0.06/min | $0.60 |
| Twilio Voice (PSTN only) | $0.013/min | -- | $0.013/min | $0.13 |
| Twilio + ConversationRelay | $0.013 + $0.02 | $0.04 | $0.073/min | $0.73 |
| Local Whisper (STT only) | $0/min | $0/min | $0/min | $0.00 |
| ElevenLabs Conversational | -- | -- | $0.001/min | $0.01 |
| Twilio phone number | -- | -- | -- | $1/month |

### Monthly Cost Estimates

| Usage Pattern | Path | Monthly Cost |
|--------------|------|-------------|
| Shane 15 min/day dashboard voice | OpenAI Realtime | ~$27/month |
| 10 customer calls/week, 3 min avg | Twilio + ConversationRelay | ~$8.80/month |
| Heavy: 60 min/day | OpenAI Realtime | ~$108/month |
| Heavy with 50% local fallback | Mixed | ~$54/month |

**Bottom line:** Normal daily usage (15 min dashboard voice + a few calls) = ~$30-40/month.

### Cost Controls

1. Session timeout: auto-disconnect after 15 minutes of silence
2. Daily budget alert at $5
3. Local fallback eliminates cost for transcription tasks
4. Real-time cost display on every session

---

## Testing Requirements

### Sub-Phase 7A: Dashboard Voice

| Test | Method | Expected Result |
|------|--------|-----------------|
| Session token generation | `curl -H "Authorization: Bearer $TOKEN" https://echo.phoenixelectric.life/api/voice/session-token` | 200 with ephemeralKey |
| Mic permission | Click mic button in Chrome | Browser permission prompt |
| WebRTC connection | Click mic, check `chrome://webrtc-internals` | Connection state = connected |
| Audio output | Speak "Hello Echo" | Hear Echo respond through speakers |
| Transcript display | Speak a phrase | Text appears in transcript panel |
| Transcript save | Complete a session | POST to /api/voice/transcripts succeeds |
| Tool call | Say "What is on the schedule today?" | Tool call fires, result spoken |
| Mute/unmute | Click Mute button | Audio track disabled, status updates |
| Disconnect | Click End Session | All resources cleaned up, status = disconnected |
| Session cost | Run 1-minute session | Cost shows ~$0.06 |
| History | Complete 2 sessions | Both appear in Recent Sessions |
| Cross-browser | Test Chrome, Firefox, Safari | All work |

### Sub-Phase 7B: Twilio

| Test | Method | Expected Result |
|------|--------|-----------------|
| Incoming call | Call Twilio number from personal phone | Hear greeting, connected to Echo |
| Outbound call | POST to /api/twilio/outbound | Phone rings, Echo speaks |
| TCPA DNC block | POST outbound to DNC-listed number | 403 with TCPA reason |
| TCPA hours block | POST outbound at 10 PM | 403 with hours restriction |
| Status callback | Make call, let it complete | Status updates in Gateway log |
| Call history | Complete phone call | Appears in dashboard history as "Phone" |

### Sub-Phase 7C: Local Voice

| Test | Method | Expected Result |
|------|--------|-----------------|
| Studio health | `curl http://100.68.34.116:8321/health` | 200 with status ok |
| Local transcribe | POST audio file to /api/voice/transcribe-local | Returns text + processing_ms |
| Fallback trigger | Disable OpenAI key, attempt voice | Falls back to local STT |
| Cold start | Restart MLX server, first request | Less than 2 seconds |

---

## Rollback Procedures

### Emergency Shutoff

```bash
# Disable voice without restarting Gateway
export VOICE_ENABLED=false
```

### Specific Rollback Steps

| Component | Rollback Action |
|-----------|----------------|
| Dashboard voice | Remove `voice-chat.js` script tag. Voice page shows "Coming Soon." |
| Twilio | Change webhook URL in Twilio Console to static TwiML ("Please call back later") |
| Local STT | Kill Flask process on Studio. Gateway auto-skips local path on 503. |
| Cost runaway | Set `OPENAI_API_KEY` to empty string. Set Twilio spending limit in dashboard. |

Voice is isolated from all other Gateway functionality. It does NOT affect chat, dashboard, agents, or any other system.

---

## Dependencies on Other Phases

| Phase | Dependency | Blocking? |
|-------|-----------|-----------|
| Phase 1 (Gateway UI) | Dashboard page shell for Voice AI tab | SOFT -- can build standalone |
| Phase 6 (Security) | OAuth/JWT for protecting /api/voice/* endpoints | HARD -- endpoints must be authenticated |
| Phase 5 (RAG) | Voice queries that search documents | SOFT -- can add later |

---

## Gauntlet Checklist

### Pre-Build Gates

- [ ] OpenAI API key with Realtime API access stored in Azure Key Vault
- [ ] HTTPS configured on Gateway (WebRTC requires secure context)
- [ ] Phase 6 (Security) JWT auth middleware functional on /api/* routes
- [ ] Browser tested: Chrome getUserMedia works on echo.phoenixelectric.life

### Sub-Phase 7A: Dashboard Voice Chat (12 tasks)

- [ ] T-V7.1: Implement /api/voice/session-token endpoint
- [ ] T-V7.2: Build VoiceChat browser class (WebRTC + data channel)
- [ ] T-V7.3: Build VoicePage dashboard module (mic button + transcript)
- [ ] T-V7.4: Add voice.css stylesheet
- [ ] T-V7.5: Wire voice route into Gateway app.js
- [ ] T-V7.6: Implement transcript save/load endpoints
- [ ] T-V7.7: Add Echo voice personality prompt
- [ ] T-V7.8: Implement voice tool calls (lookup_job, check_schedule, get_price)
- [ ] T-V7.9: Test WebRTC via chrome://webrtc-internals
- [ ] T-V7.10: Test across Chrome, Firefox, Safari
- [ ] T-V7.11: Add session duration + cost tracking display
- [ ] T-V7.12: Error recovery (reconnect on disconnect)

### Sub-Phase 7B: Twilio Phone Integration (11 tasks)

- [ ] T-V7.13: Create Twilio account + purchase phone number
- [ ] T-V7.14: Store Twilio credentials in Azure Key Vault
- [ ] T-V7.15: Implement /api/twilio/incoming webhook
- [ ] T-V7.16: Implement ConversationRelay WebSocket handler
- [ ] T-V7.17: Implement /api/twilio/outbound with TCPA compliance
- [ ] T-V7.18: Implement /api/twilio/status-callback
- [ ] T-V7.19: Configure Twilio Console webhooks
- [ ] T-V7.20: Test incoming call end-to-end
- [ ] T-V7.21: Test outbound call with TCPA pass
- [ ] T-V7.22: Test outbound call with TCPA block
- [ ] T-V7.23: Add call logging and history display

### Sub-Phase 7C: Local Voice Sovereignty (7 tasks)

- [ ] T-V7.24: Install MLX-Audio on Mac Studio
- [ ] T-V7.25: Deploy Flask STT server (port 8321)
- [ ] T-V7.26: Create systemd/launchd service for auto-start
- [ ] T-V7.27: Implement /api/voice/transcribe-local endpoint
- [ ] T-V7.28: Implement voice routing logic (path selection)
- [ ] T-V7.29: Test fallback: OpenAI down -> local Whisper
- [ ] T-V7.30: Test cold start latency on M3 Ultra

### Post-Build Quality Gates

- [ ] Adversarial review of all voice endpoints (injection, auth bypass)
- [ ] Cost monitoring verified (OpenAI + Twilio spend tracking)
- [ ] TCPA compliance verified with legal requirements
- [ ] No API keys exposed to browser (ephemeral tokens only)
- [ ] All voice sessions produce searchable transcripts
- [ ] Voice page renders correctly on mobile (responsive CSS)
- [ ] Rollback procedure tested (voice disabled, no side effects)

---

## Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| API key in browser | CRITICAL | Ephemeral tokens only -- expire in minutes, scoped to single session |
| TCPA violation on outbound calls | CRITICAL | Compliance check mandatory before every outbound call |
| OpenAI Realtime API rate limit | MEDIUM | Fall back to local Whisper STT + text-to-Claude + ElevenLabs TTS |
| WebRTC fails behind corporate firewall | LOW | Gateway is on public VPS -- no NAT traversal needed |
| Cost runaway from long/forgotten sessions | MEDIUM | Auto-disconnect timer, daily budget alerts, dashboard cost display |
| Echo personality drift in voice | LOW | System prompt locked in buildEchoVoicePrompt(), not user-editable |
| Browser mic permission denied | LOW | Clear error message with instructions, graceful degradation to text |
| Mac Studio offline | LOW | Local is fallback only -- OpenAI Realtime is primary path |
| Twilio account suspension | MEDIUM | Keep account in good standing, monitor balance, set up alerts |
| Audio quality issues (echo, feedback) | MEDIUM | echoCancellation + noiseSuppression in getUserMedia constraints |

---

## Shane's Decisions Required (Pre-Build)

1. **Voice preference:** Start with `cedar` voice, or test others first?
2. **Twilio timing:** Ship phone integration in Week 3-4, or defer to Month 2?
3. **Twilio phone number:** What area code? Local to Phoenix Electric's market.
4. **TCPA DNC list:** Do you already have a Do Not Call list, or start from scratch?
5. **Local voice priority:** Is the Mac Studio fallback a Week 1 priority or Month 2?
6. **Budget comfort:** $30-40/month for voice acceptable?

---

## Out of Scope

- Gateway UI rebuild (Phase 1)
- Multi-agent voice handoff (future)
- Voice-to-voice without any text (always produce transcript)
- Video calling
- Pipecat multi-provider orchestration (deferred unless needed)

---

## References

- Research Bible Section 04-05, Voice AI Research Bible (58KB)
- Companion Playbook: `06_PLAYBOOKS/PHASE_07_PLAYBOOK.md`
