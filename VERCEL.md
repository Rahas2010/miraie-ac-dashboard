# Vercel Deployment Guide

## Step-by-Step Deployment

### 1. Push to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit: MirAIe AC Dashboard"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/miraie-ac-dashboard.git
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select your `miraie-ac-dashboard` repo
4. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `next build` (default)
   - **Output Directory**: `.next` (default)
5. Add **Environment Variables**:
   ```
   MIRAIE_USER_ID = your_email@example.com
   MIRAIE_PASSWORD = your_miraie_password
   NEXT_PUBLIC_MQTT_BRIDGE_URL = wss://your-bridge-url
   NEXT_PUBLIC_VOICE_ENABLED = true
   NEXT_PUBLIC_APP_NAME = My AC Dashboard
   ```
6. Click **Deploy**

### 3. Deploy MQTT Bridge (for real-time updates)

#### Railway (Easiest)

1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub Repo**
3. Select your repo
4. Set **Root Directory** to `mqtt-bridge`
5. Add environment variables:
   ```
   MIRAIE_USER_ID = your_email@example.com
   MIRAIE_PASSWORD = your_miraie_password
   WS_PORT = 3001
   CORS_ORIGIN = https://your-app.vercel.app
   ```
6. Deploy
7. Copy the generated URL (e.g., `https://miraie-bridge.up.railway.app`)
8. Go back to Vercel → Settings → Environment Variables
9. Update `NEXT_PUBLIC_MQTT_BRIDGE_URL` to `wss://your-bridge-url`

### 4. Custom Domain (Optional)

In Vercel:
1. Go to your project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

## Architecture After Deployment

```
Users (Browser/Mobile)
        │
        ▼
┌───────────────────┐
│   Vercel CDN      │  ← Static assets, edge caching
│   (your-app.com)  │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│  Vercel Functions  │  ← API routes (auth, devices, proxy)
│  (Serverless)     │
└───────┬───────────┘
        │
        ├──────────────────────┐
        │                      │
        ▼                      ▼
┌───────────────┐    ┌──────────────────┐
│ MirAIe APIs   │    │ Railway/Fly.io   │
│ (Panasonic)   │    │ (MQTT Bridge)    │
└───────────────┘    └────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  mqtt.miraie.in   │
                     │  (MQTT Broker)   │
                     └────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │    Your AC 🌡️    │
                     └──────────────────┘
```

## Costs

| Service | Free Tier | Cost |
|---------|-----------|------|
| Vercel | 100GB bandwidth, 1000 serverless invocations | Free for personal |
| Railway | 500 hours/month, 1GB RAM | Free tier available |
| Fly.io | 3 shared VMs, 160GB bandwidth | Free tier available |
| Render | 750 hours/month | Free tier available |

**Total: Can be 100% free for personal use!**

## Troubleshooting

### "MQTT bridge not reachable"
- Make sure the bridge service is running
- Check that `NEXT_PUBLIC_MQTT_BRIDGE_URL` is set correctly
- Ensure CORS_ORIGIN on the bridge matches your Vercel URL

### "Login failed"
- Double-check your MirAIe credentials
- Make sure you're using the same email/mobile as the MirAIe app
- Try logging into the MirAIe mobile app first to verify credentials

### "No devices found"
- Ensure your AC is connected to WiFi and shows online in the MirAIe app
- Check that the AC is registered to your MirAIe account

### Vercel Function Timeout
- Default timeout is 10 seconds on free plan
- API routes are designed to complete quickly
- If timeout occurs, check MirAIe API availability
