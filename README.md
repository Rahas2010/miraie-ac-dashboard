# 🌡️ MirAIe AC Dashboard

A beautiful, modern web dashboard for controlling your Panasonic MirAIe air conditioner. Built with Next.js, Tailwind CSS, and deployed on Vercel.

![Dashboard Preview](https://via.placeholder.com/800x500/f8fafc/0ea5e9?text=MirAIe+Dashboard)

## ✨ Features

- 🎨 **Beautiful Clean UI** — Apple-inspired glassmorphism design
- 🌡️ **Full AC Control** — Temperature, mode, fan speed, presets, swing
- 📊 **Usage Stats** — Track runtime, energy consumption, and patterns
- ⏰ **Scheduling** — Automate your AC with custom schedules
- 🔄 **Real-time Updates** — Live status via WebSocket (hybrid mode)
- 🎤 **Voice Control** — Control with voice commands (browser support)
- 📱 **Mobile Responsive** — Works perfectly on phone and tablet
- 🔒 **Secure** — Your credentials, your data, your control

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         VERCEL                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Next.js App                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │   │
│  │  │   UI     │  │  API     │  │  Static Assets    │  │   │
│  │  │ (React)  │──│  Routes  │──│  (CSS, Images)    │  │   │
│  │  └──────────┘  └────┬─────┘  └───────────────────┘  │   │
│  └─────────────────────┼────────────────────────────────┘   │
│                        │                                     │
└────────────────────────┼─────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌──────────────┐
   │ MirAIe   │  │ MirAIe   │  │ MQTT Bridge  │
   │ Auth API │  │ App API  │  │ (Optional)   │
   └──────────┘  └──────────┘  └──────┬───────┘
                                      │
                               ┌──────▼───────┐
                               │  MQTT Broker │
                               │ mqtt.miraie.in│
                               └──────┬───────┘
                                      │
                               ┌──────▼───────┐
                               │   Your AC    │
                               │   🌡️ ❄️ 🔥   │
                               └──────────────┘
```

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/miraie-ac-dashboard.git
cd miraie-ac-dashboard
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
MIRAIE_USER_ID=your_email@example.com
MIRAIE_PASSWORD=your_miraie_password
NEXT_PUBLIC_MQTT_BRIDGE_URL=ws://localhost:3001
```

### 3. Run Development Server

```bash
# Terminal 1: Next.js app
npm run dev

# Terminal 2: MQTT Bridge (for real-time updates)
npm run mqtt-bridge
```

Open [http://localhost:3000](http://localhost:3000)

## 📦 Deployment

### Deploy Frontend to Vercel

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repo
4. Add environment variables:
   - `MIRAIE_USER_ID` — Your MirAIe email/mobile
   - `MIRAIE_PASSWORD` — Your MirAIe password
   - `NEXT_PUBLIC_MQTT_BRIDGE_URL` — Your bridge URL (see below)
5. Deploy!

### Deploy MQTT Bridge

Choose one platform for the persistent MQTT bridge:

#### Option A: Railway (Recommended — Free Tier)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Set environment variables
railway variables set MIRAIE_USER_ID=your_email@example.com
railway variables set MIRAIE_PASSWORD=your_password
railway variables set WS_PORT=3001
railway variables set CORS_ORIGIN=https://your-app.vercel.app

# Deploy
railway up
```

#### Option B: Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login and create app
fly auth login
fly launch

# Set secrets
fly secrets set MIRAIE_USER_ID=your_email@example.com
fly secrets set MIRAIE_PASSWORD=your_password

# Deploy
fly deploy
```

#### Option C: Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your repo
3. Set build command: `cd mqtt-bridge && npm install`
4. Set start command: `cd mqtt-bridge && npm start`
5. Add environment variables
6. Deploy

#### Option D: Raspberry Pi / Home Server

```bash
# SSH into your Pi
ssh pi@your-pi-ip

# Clone and setup
git clone https://github.com/yourusername/miraie-ac-dashboard.git
cd miraie-ac-dashboard/mqtt-bridge
npm install

# Configure
cp .env.example .env
nano .env  # Add your credentials

# Run with PM2 (auto-restart)
npm install -g pm2
pm2 start index.js --name miraie-bridge
pm2 save
pm2 startup
```

### Update Vercel Environment

After deploying the bridge, update your Vercel project:
```
NEXT_PUBLIC_MQTT_BRIDGE_URL=wss://your-bridge-url.com
```

## 🎮 Usage

### Basic Controls
- **Power Button** — Turn AC on/off
- **Temperature Slider** — Drag or use +/- buttons (16°C - 30°C)
- **Mode Selection** — Cool, Heat, Dry, Auto, Fan
- **Fan Speed** — Auto, Low, Medium, High

### Quick Actions
- **Quick Cool** — 22°C, Cool mode, High fan
- **Comfort** — 24°C, Auto mode, Auto fan
- **Sleep** — 26°C, Cool mode, Low fan, Economy preset

### Presets
- **Nanoe G** — Air purification mode
- **Powerful** — Maximum cooling power
- **Economy** — Energy saving mode

## 🔒 Security

- Your MirAIe credentials are stored only in your Vercel environment variables
- All API calls go through your own serverless functions
- The MQTT bridge connects directly to Panasonic's servers
- No third-party analytics or tracking
- You can audit the entire codebase

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Animations | Framer Motion, CSS |
| Charts | Recharts |
| MQTT | mqtt.js |
| WebSocket | ws |
| Deployment | Vercel + Railway/Fly.io |

## 📁 Project Structure

```
miraie-ac-dashboard/
├── src/
│   ├── app/
│   │   ├── api/           # Serverless API routes
│   │   │   ├── auth/      # Authentication
│   │   │   ├── devices/   # Device listing
│   │   │   ├── control/   # AC commands
│   │   │   ├── status/    # Device status
│   │   │   └── bridge/    # MQTT bridge proxy
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Main dashboard
│   │   └── globals.css    # Global styles
│   └── lib/
│       ├── miraie-api.ts  # MirAIe API client
│       └── types.ts       # TypeScript types
├── mqtt-bridge/           # Standalone MQTT service
│   ├── index.js           # Bridge server
│   ├── package.json
│   └── README.md
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License — feel free to use this project for personal use.

## ⚠️ Disclaimer

This project uses reverse-engineered APIs from Panasonic's MirAIe platform. It is not officially supported by Panasonic. Use at your own risk. The APIs may change without notice.

## 🙏 Credits

- [chrissmartin/hass-panasonic-miraie](https://github.com/chrissmartin/hass-panasonic-miraie) — Home Assistant integration (API reference)
- [rkzofficial/miraie-ac](https://github.com/rkzofficial/miraie-ac) — Python library (MQTT reference)
- [kholia/Panasonic-Smart-AC-Research](https://github.com/kholia/Panasonic-Smart-AC-Research) — Reverse engineering work
