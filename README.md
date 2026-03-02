# HospitalityIQ 🏨

> AI-powered competitor research & LLM visibility analysis for US hospitality businesses.

## What It Does

- Analyzes a client's website and identifies their exact business sub-type
- Finds real, same-type competitors in the same city using live web search
- Generates gap analysis, SEO comparison, and LLM visibility recommendations
- Produces a downloadable HTML report (printable as PDF)

---

## Deploy to Vercel (5 minutes)

### 1. Fork this repo on GitHub
Click **Fork** at the top right of this repo page.

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your forked GitHub repo
3. Vercel will auto-detect it as a Vite project — no build settings needed

### 3. Add your Anthropic API Key
In Vercel project settings → **Environment Variables**, add:

```
ANTHROPIC_API_KEY = sk-ant-api03-your-key-here
```

Get your key at [console.anthropic.com](https://console.anthropic.com)

### 4. Deploy
Click **Deploy** — you'll have a live URL in ~60 seconds.

---

## Run Locally

```bash
# Install dependencies
npm install

# Create your local env file
cp .env.example .env
# Edit .env and add your VITE_DEV_API_KEY

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Cost

Each report costs approximately **$1–3** in Anthropic API fees (Claude Sonnet + web search).

---

## Tech Stack

- **React 18** + **Vite**
- **Recharts** for radar/bar charts
- **Anthropic Claude API** with built-in web search
- **Vercel** for hosting + serverless API proxy

---

## License

MIT
