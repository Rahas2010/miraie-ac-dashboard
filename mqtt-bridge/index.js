/**
 * Panasonic MirAIe MQTT Bridge
 * 
 * This service maintains a persistent MQTT connection to the MirAIe broker
 * and provides WebSocket updates to the frontend dashboard.
 * 
 * Deploy this on Railway, Fly.io, Render, or any VPS.
 * 
 * Usage:
 *   1. Copy .env.example to .env and fill in your credentials
 *   2. npm install
 *   3. npm start
 */

require('dotenv').config();
const mqtt = require('mqtt');
const { WebSocketServer } = require('ws');
const http = require('http');

// Configuration
const MIRAIE_AUTH_URL = 'https://auth.miraie.in/simplifi/v1';
const MIRAIE_APP_URL = 'https://app.miraie.in/simplifi/v1';
const MIRAIE_BROKER_HOST = 'mqtt.miraie.in';
const MIRAIE_BROKER_PORT = 8883;
const MIRAIE_CLIENT_ID = 'PBcMcfG19njNCL8AOgvRzIC8AjQa';

const WS_PORT = parseInt(process.env.WS_PORT || '3001');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// State
let accessToken = null;
let mqttClient = null;
let devices = [];
let deviceStates = {};
let wsClients = new Set();

// ===== HTTP Server + WebSocket =====

const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      mqttConnected: mqttClient?.connected || false,
      devices: devices.length,
      wsClients: wsClients.size,
      uptime: process.uptime(),
    }));
    return;
  }

  // Devices endpoint
  if (req.url === '/devices') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': CORS_ORIGIN,
    });
    res.end(JSON.stringify({
      devices,
      states: deviceStates,
    }));
    return;
  }

  // Control endpoint
  if (req.url === '/control' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { deviceId, command } = JSON.parse(body);
        const success = sendDeviceCommand(deviceId, command);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': CORS_ORIGIN,
        });
        res.end(JSON.stringify({ success }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  wsClients.add(ws);

  // Send current state to new client
  ws.send(JSON.stringify({
    type: 'init',
    devices,
    states: deviceStates,
  }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'control' && msg.deviceId && msg.command) {
        sendDeviceCommand(msg.deviceId, msg.command);
      }
    } catch (err) {
      console.error('Invalid WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log('WebSocket client disconnected');
  });
});

function broadcast(data) {
  const message = JSON.stringify(data);
  wsClients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

// ===== MirAIe Authentication =====

async function login() {
  const userId = process.env.MIRAIE_USER_ID;
  const password = process.env.MIRAIE_PASSWORD;

  if (!userId || !password) {
    throw new Error('MIRAIE_USER_ID and MIRAIE_PASSWORD must be set');
  }

  const isEmail = userId.includes('@');
  const scope = `an_${Math.floor(Math.random() * 999999999)}`;

  const payload = {
    clientId: MIRAIE_CLIENT_ID,
    password,
    scope,
  };

  if (isEmail) {
    payload.email = userId;
  } else {
    payload.mobile = userId;
  }

  console.log(`Logging in as ${userId}...`);

  const response = await fetch(`${MIRAIE_AUTH_URL}/userManagement/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login failed (${response.status}): ${error}`);
  }

  const data = await response.json();
  accessToken = data.accessToken;
  console.log('Login successful');
  return accessToken;
}

// ===== Device Discovery =====

async function fetchDevices() {
  if (!accessToken) {
    await login();
  }

  const response = await fetch(`${MIRAIE_APP_URL}/homeManagement/homes`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    if (response.status === 401) {
      accessToken = null;
      await login();
      return fetchDevices();
    }
    throw new Error(`Failed to fetch homes: ${response.status}`);
  }

  const homes = await response.json();
  devices = [];

  for (const home of homes) {
    for (const space of home.spaces || []) {
      for (const device of space.devices || []) {
        devices.push({
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          topic: Array.isArray(device.topic) ? device.topic : [device.topic],
          homeId: home.homeId,
          homeName: home.homeName,
          spaceId: space.spaceId,
          spaceName: space.spaceName,
        });
      }
    }
  }

  console.log(`Found ${devices.length} device(s)`);
  broadcast({ type: 'devices', devices });
  return devices;
}

// ===== MQTT Connection =====

async function connectMQTT() {
  if (!accessToken) {
    await login();
  }

  if (!devices.length) {
    await fetchDevices();
  }

  if (mqttClient) {
    mqttClient.end(true);
  }

  const homeId = devices[0]?.homeId;
  if (!homeId) {
    throw new Error('No home ID found');
  }

  const brokerUrl = `mqtts://${MIRAIE_BROKER_HOST}:${MIRAIE_BROKER_PORT}`;

  console.log(`Connecting to MQTT broker: ${brokerUrl}`);

  mqttClient = mqtt.connect(brokerUrl, {
    username: homeId,
    password: accessToken,
    clientId: `miraie-bridge-${Date.now()}`,
    keepalive: 30,
    reconnectPeriod: 5000,
    rejectUnauthorized: false,
  });

  return new Promise((resolve, reject) => {
    mqttClient.on('connect', () => {
      console.log('Connected to MQTT broker');

      // Subscribe to all device topics
      for (const device of devices) {
        const topics = Array.isArray(device.topic) ? device.topic : [device.topic];
        for (const topic of topics) {
          // Subscribe to status topic
          const statusTopic = topic.replace('/control', '/status');
          mqttClient.subscribe(statusTopic, { qos: 1 }, (err) => {
            if (err) {
              console.error(`Failed to subscribe to ${statusTopic}:`, err);
            } else {
              console.log(`Subscribed to ${statusTopic}`);
            }
          });

          // Also subscribe to the original topic
          mqttClient.subscribe(topic, { qos: 1 }, (err) => {
            if (err) {
              console.error(`Failed to subscribe to ${topic}:`, err);
            } else {
              console.log(`Subscribed to ${topic}`);
            }
          });
        }
      }

      resolve(true);
    });

    mqttClient.on('message', (topic, payload) => {
      try {
        const payloadStr = payload.toString();
        let data;

        try {
          data = JSON.parse(payloadStr);
        } catch {
          data = { raw: payloadStr };
        }

        console.log(`Message on ${topic}:`, data);

        // Find which device this belongs to
        const device = devices.find(d => {
          const topics = Array.isArray(d.topic) ? d.topic : [d.topic];
          return topics.some(t => topic.includes(d.deviceId) || topic.includes(t));
        });

        if (device) {
          deviceStates[device.deviceId] = {
            ...deviceStates[device.deviceId],
            ...data,
            lastUpdated: new Date().toISOString(),
          };

          broadcast({
            type: 'status',
            deviceId: device.deviceId,
            state: deviceStates[device.deviceId],
          });
        }
      } catch (err) {
        console.error('Error processing MQTT message:', err);
      }
    });

    mqttClient.on('error', (err) => {
      console.error('MQTT Error:', err);
      reject(err);
    });

    mqttClient.on('offline', () => {
      console.log('MQTT client offline');
      broadcast({ type: 'connection', status: 'offline' });
    });

    mqttClient.on('reconnect', () => {
      console.log('MQTT client reconnecting...');
      broadcast({ type: 'connection', status: 'reconnecting' });
    });
  });
}

// ===== Device Control =====

function sendDeviceCommand(deviceId, command) {
  if (!mqttClient || !mqttClient.connected) {
    console.error('MQTT not connected');
    return false;
  }

  const device = devices.find(d => d.deviceId === deviceId);
  if (!device) {
    console.error(`Device ${deviceId} not found`);
    return false;
  }

  const topic = Array.isArray(device.topic) ? device.topic[0] : device.topic;

  // Map command to MirAIe format
  const payload = {};

  if (command.power !== undefined) {
    payload.power = command.power ? 1 : 0;
  }
  if (command.mode !== undefined) {
    const modeMap = { cool: 0, dry: 1, heat: 3, auto: 4, fan: 2, off: 0 };
    payload.mode = modeMap[command.mode] ?? 0;
  }
  if (command.temperature !== undefined) {
    payload.temperature = command.temperature;
  }
  if (command.fanSpeed !== undefined) {
    const fanMap = { auto: 0, low: 1, medium: 2, high: 3 };
    payload.fanSpeed = fanMap[command.fanSpeed] ?? 0;
  }
  if (command.swingH !== undefined) {
    payload.swingH = command.swingH ? 1 : 0;
  }
  if (command.swingV !== undefined) {
    payload.swingV = command.swingV ? 1 : 0;
  }

  const message = JSON.stringify(payload);
  console.log(`Sending to ${topic}:`, message);

  mqttClient.publish(topic, message, { qos: 1 }, (err) => {
    if (err) {
      console.error('Failed to publish:', err);
    } else {
      console.log('Command sent successfully');

      // Update local state
      if (deviceStates[deviceId]) {
        deviceStates[deviceId] = {
          ...deviceStates[deviceId],
          ...command,
          lastUpdated: new Date().toISOString(),
        };

        broadcast({
          type: 'status',
          deviceId,
          state: deviceStates[deviceId],
        });
      }
    }
  });

  return true;
}

// ===== Main =====

async function main() {
  console.log('=== MirAIe MQTT Bridge ===');
  console.log(`WebSocket server starting on port ${WS_PORT}`);

  try {
    // Login and discover devices
    await login();
    await fetchDevices();

    // Connect to MQTT
    await connectMQTT();

    // Start WebSocket server
    server.listen(WS_PORT, () => {
      console.log(`\n✅ Bridge is running!`);
      console.log(`   WebSocket: ws://localhost:${WS_PORT}`);
      console.log(`   Health:    http://localhost:${WS_PORT}/health`);
      console.log(`   Devices:   http://localhost:${WS_PORT}/devices`);
      console.log(`\n   Devices found: ${devices.length}`);
      devices.forEach(d => {
        console.log(`   - ${d.spaceName}: ${d.deviceName} (${d.deviceId})`);
      });
    });
  } catch (err) {
    console.error('Failed to start bridge:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  if (mqttClient) {
    mqttClient.end(true);
  }
  wss.close();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (mqttClient) mqttClient.end(true);
  wss.close();
  server.close();
  process.exit(0);
});

main();
