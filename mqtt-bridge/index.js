/**
 * Panasonic MirAIe MQTT Bridge
 * 
 * Maintains persistent MQTT connection to MirAIe broker
 * and provides WebSocket updates + REST API to the frontend.
 * 
 * Real MirAIe MQTT endpoints:
 * - Broker: mqtt.miraie.in:8883 (MQTTS)
 * - Auth: Home ID as username, access token as password
 * - Topics: Device-specific, discovered via API
 */

require('dotenv').config();
const mqtt = require('mqtt');
const { WebSocketServer } = require('ws');
const http = require('http');

// ===== Configuration =====
const MIRAIE_AUTH_URL = 'https://auth.miraie.in/simplifi/v1';
const MIRAIE_APP_URL = 'https://app.miraie.in/simplifi/v1';
const MIRAIE_BROKER_HOST = 'mqtt.miraie.in';
const MIRAIE_BROKER_PORT = 8883;
const MIRAIE_CLIENT_ID = 'PBcMcfG19njNCL8AOgvRzIC8AjQa';

const WS_PORT = parseInt(process.env.WS_PORT || '3001');

// ===== State =====
let accessToken = null;
let tokenExpiry = 0;
let mqttClient = null;
let devices = [];
let deviceStates = {};
let homeId = null;
let wsClients = new Set();

// ===== HTTP Server + WebSocket =====

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      mqttConnected: mqttClient?.connected || false,
      devices: devices.length,
      wsClients: wsClients.size,
      uptime: process.uptime(),
      homeId: homeId,
    }));
    return;
  }

  // Devices list
  if (url.pathname === '/devices') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ devices, states: deviceStates }));
    return;
  }

  // Control endpoint
  if (url.pathname === '/control' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { deviceId, command } = JSON.parse(body);
        const success = sendDeviceCommand(deviceId, command);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
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
      'Access-Control-Allow-Origin': '*',
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
  console.log('[WS] Client connected');
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
      console.error('[WS] Invalid message:', err);
    }
  });

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log('[WS] Client disconnected');
  });
});

function broadcast(data) {
  const message = JSON.stringify(data);
  for (const client of wsClients) {
    if (client.readyState === 1) client.send(message);
  }
}

// ===== MirAIe Authentication =====

async function login() {
  const userId = process.env.MIRAIE_USER_ID;
  const password = process.env.MIRAIE_PASSWORD;

  if (!userId || !password) {
    throw new Error('MIRAIE_USER_ID and MIRAIE_PASSWORD must be set');
  }

  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const isEmail = userId.includes('@');
  const scope = `an_${Math.floor(Math.random() * 999999999)}`;

  const payload = { clientId: MIRAIE_CLIENT_ID, password, scope };
  if (isEmail) payload.email = userId;
  else payload.mobile = userId;

  console.log(`[Auth] Logging in as ${userId}...`);

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
  tokenExpiry = Date.now() + 6 * 24 * 60 * 60 * 1000;
  console.log('[Auth] Login successful');
  return accessToken;
}

// ===== Device Discovery =====

async function fetchDevices() {
  const token = await login();

  console.log('[Devices] Fetching homes...');

  const response = await fetch(`${MIRAIE_APP_URL}/homeManagement/homes`, {
    headers: { Authorization: `Bearer ${token}` },
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
    homeId = home.homeId;
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
          firmwareVersion: device.firmwareVersion,
          modelName: device.modelName,
        });
      }
    }
  }

  console.log(`[Devices] Found ${devices.length} device(s)`);
  devices.forEach((d) =>
    console.log(`  - ${d.spaceName}: ${d.deviceName} (${d.deviceId})`)
  );

  broadcast({ type: 'devices', devices });
  return devices;
}

// ===== Energy Consumption (Cloud Polling) =====

async function fetchEnergyData(deviceId) {
  try {
    const token = await login();
    const response = await fetch(
      `${MIRAIE_APP_URL}/deviceManagement/devices/${deviceId}/energy`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return {
        energyConsumption: data.energyConsumption || data.totalEnergy || 0,
        powerUsage: data.powerUsage || data.currentPower || 0,
      };
    }
  } catch (err) {
    console.log(`[Energy] Could not fetch energy data for ${deviceId}:`, err.message);
  }
  return null;
}

// ===== MQTT Connection =====

async function connectMQTT() {
  if (!accessToken) await login();
  if (!devices.length) await fetchDevices();

  if (mqttClient) {
    mqttClient.end(true);
  }

  if (!homeId) {
    throw new Error('No home ID found');
  }

  const brokerUrl = `mqtts://${MIRAIE_BROKER_HOST}:${MIRAIE_BROKER_PORT}`;

  console.log(`[MQTT] Connecting to ${brokerUrl}...`);

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
      console.log('[MQTT] Connected to broker');

      // Subscribe to all device topics
      for (const device of devices) {
        const topics = Array.isArray(device.topic) ? device.topic : [device.topic];
        for (const topic of topics) {
          // Status topic
          const statusTopic = topic.replace('/control', '/status');
          mqttClient.subscribe(statusTopic, { qos: 1 }, (err) => {
            if (err) console.error(`[MQTT] Subscribe failed for ${statusTopic}:`, err);
            else console.log(`[MQTT] Subscribed to ${statusTopic}`);
          });

          // Also subscribe to original topic for state updates
          mqttClient.subscribe(topic, { qos: 1 }, (err) => {
            if (err) console.error(`[MQTT] Subscribe failed for ${topic}:`, err);
            else console.log(`[MQTT] Subscribed to ${topic}`);
          });
        }
      }

      resolve(true);
    });

    mqttClient.on('message', (topic, payload) => {
      try {
        const data = JSON.parse(payload.toString());
        console.log(`[MQTT] ${topic}:`, data);

        // Find device by topic
        const device = devices.find((d) => {
          const topics = Array.isArray(d.topic) ? d.topic : [d.topic];
          return topics.some((t) => topic.includes(d.deviceId) || topic.includes(t));
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
        console.error('[MQTT] Error processing message:', err);
      }
    });

    mqttClient.on('error', (err) => {
      console.error('[MQTT] Error:', err);
      reject(err);
    });

    mqttClient.on('offline', () => {
      console.log('[MQTT] Offline');
      broadcast({ type: 'connection', status: 'offline' });
    });

    mqttClient.on('reconnect', () => {
      console.log('[MQTT] Reconnecting...');
      broadcast({ type: 'connection', status: 'reconnecting' });
    });
  });
}

// ===== Device Control =====

function sendDeviceCommand(deviceId, command) {
  if (!mqttClient || !mqttClient.connected) {
    console.error('[MQTT] Not connected');
    return false;
  }

  const device = devices.find((d) => d.deviceId === deviceId);
  if (!device) {
    console.error(`[MQTT] Device ${deviceId} not found`);
    return false;
  }

  const topic = Array.isArray(device.topic) ? device.topic[0] : device.topic;

  // Map command to MirAIe MQTT format
  const payload = {};

  if (command.power !== undefined) {
    payload.power = command.power ? 1 : 0;
  }
  if (command.mode !== undefined) {
    const modeMap = { cool: 0, dry: 1, fan: 2, heat: 3, auto: 4, off: 0 };
    payload.mode = modeMap[command.mode] ?? 0;
  }
  if (command.temperature !== undefined) {
    payload.temperature = command.temperature;
  }
  if (command.fanSpeed !== undefined) {
    const fanMap = { auto: 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 };
    payload.fanSpeed = fanMap[command.fanSpeed] ?? 0;
  }
  if (command.verticalSwingPosition !== undefined) {
    payload.verticalSwing = parseInt(command.verticalSwingPosition);
  }
  if (command.horizontalSwingPosition !== undefined) {
    payload.horizontalSwing = parseInt(command.horizontalSwingPosition);
  }
  if (command.crystalClean !== undefined) {
    payload.crystalClean = command.crystalClean ? 1 : 0;
  }
  if (command.acdc !== undefined) {
    payload.acdc = command.acdc ? 1 : 0;
  }

  const message = JSON.stringify(payload);
  console.log(`[MQTT] Sending to ${topic}:`, message);

  mqttClient.publish(topic, message, { qos: 1 }, (err) => {
    if (err) console.error('[MQTT] Publish failed:', err);
    else {
      console.log('[MQTT] Command sent');
      // Update local state
      if (deviceStates[deviceId]) {
        deviceStates[deviceId] = {
          ...deviceStates[deviceId],
          ...command,
          lastUpdated: new Date().toISOString(),
        };
        broadcast({ type: 'status', deviceId, state: deviceStates[deviceId] });
      }
    }
  });

  return true;
}

// ===== Main =====

async function main() {
  console.log('=================================');
  console.log('  MirAIe MQTT Bridge');
  console.log('=================================');
  console.log(`User: ${process.env.MIRAIE_USER_ID}`);
  console.log(`Port: ${WS_PORT}`);
  console.log('');

  try {
    // Login and discover devices
    await login();
    await fetchDevices();

    // Connect to MQTT
    await connectMQTT();

    // Poll energy data every 5 minutes
    setInterval(async () => {
      for (const device of devices) {
        const energy = await fetchEnergyData(device.deviceId);
        if (energy) {
          deviceStates[device.deviceId] = {
            ...deviceStates[device.deviceId],
            ...energy,
          };
          broadcast({
            type: 'energy',
            deviceId: device.deviceId,
            data: energy,
          });
        }
      }
    }, 5 * 60 * 1000);

    // Start server
    server.listen(WS_PORT, () => {
      console.log('');
      console.log('✅ Bridge is running!');
      console.log(`   WebSocket: ws://localhost:${WS_PORT}`);
      console.log(`   Health:    http://localhost:${WS_PORT}/health`);
      console.log(`   Devices:   http://localhost:${WS_PORT}/devices`);
      console.log('');
      console.log(`   Devices: ${devices.length}`);
      devices.forEach((d) =>
        console.log(`   - ${d.spaceName}: ${d.deviceName}`)
      );
    });
  } catch (err) {
    console.error('Failed to start bridge:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  if (mqttClient) mqttClient.end(true);
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
