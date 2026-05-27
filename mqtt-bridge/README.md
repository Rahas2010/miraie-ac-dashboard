# MirAIe MQTT Bridge

A standalone service that maintains a persistent MQTT connection to Panasonic's MirAIe broker and provides real-time updates via WebSocket.

## Why This Is Needed

Vercel's serverless functions can't maintain persistent MQTT connections. This bridge service:
- Keeps a live MQTT connection to your AC
- Pushes real-time status updates to the dashboard
- Accepts commands from the dashboard

## Quick Start

```bash
# Install dependencies
npm install

# Configure
cp .env.example .env
# Edit .env with your MirAIe credentials

# Start
npm start
```

## Environment Variables

```env
# Required: Your MirAIe credentials
MIRAIE_USER_ID=your_email@example.com
MIRAIE_PASSWORD=your_password

# Optional: WebSocket server port (default: 3001)
WS_PORT=3001

# Optional: CORS origin (default: *)
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check and status |
| `/devices` | GET | List devices and current states |
| `/control` | POST | Send command to a device |

## WebSocket Messages

### From Bridge → Client

```json
// Initial state
{ "type": "init", "devices": [...], "states": {...} }

// Device status update
{ "type": "status", "deviceId": "xxx", "state": {...} }

// Connection status
{ "type": "connection", "status": "online" | "offline" | "reconnecting" }
```

### From Client → Bridge

```json
// Control command
{ "type": "control", "deviceId": "xxx", "command": { "power": true, "temperature": 24 } }
```

## Deploy to Railway

1. Create a new Railway project
2. Connect your repo (or deploy from this folder)
3. Set environment variables
4. Deploy

## Deploy to Fly.io

```bash
fly launch
fly secrets set MIRAIE_USER_ID=xxx MIRAIE_PASSWORD=xxx
fly deploy
```

## Deploy to Render

1. Create a new Web Service
2. Connect your repo
3. Set build command: `cd mqtt-bridge && npm install`
4. Set start command: `cd mqtt-bridge && npm start`
5. Add environment variables
