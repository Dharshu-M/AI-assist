# 🤖 AI Career Assistant — Chrome Extension

An AI-powered Chrome Extension that generates cover letters, analyzes LinkedIn profiles, and tracks job applications — powered by Claude AI.

---

## 📁 File Structure

```
chrome-extension/
├── manifest.json       ← Extension config (permissions, scripts)
├── popup.html          ← Main UI (shown when clicking the icon)
├── popup.js            ← UI logic + Claude API calls
├── content.js          ← Runs on job pages (scrapes data, injects button)
├── content.css         ← Styles for the floating button
├── background.js       ← Service worker (context menus, events)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## 🚀 How to Install (Developer Mode)

1. **Add icons** — Place 3 PNG icon files in the `icons/` folder:
   - `icon16.png` (16×16)
   - `icon48.png` (48×48)
   - `icon128.png` (128×128)
   *(You can use any square PNG and resize it)*

2. **Open Chrome** and go to: `chrome://extensions`

3. **Enable Developer Mode** (toggle in top-right corner)

4. **Click "Load unpacked"** → Select the `chrome-extension/` folder

5. The extension icon will appear in your toolbar 🎉

---

## 🔑 Setting Up Your API Key

1. Get a Claude API key from: https://console.anthropic.com
2. Click the extension icon
3. Go to the **Settings** tab (⚙️)
4. Paste your API key and click **Save**

---

## ✨ Features

| Feature | How to Use |
|---|---|
| **Cover Letter Generator** | Paste a job description → click Generate |
| **Auto-detect Job** | Visit a LinkedIn/Indeed job page → click "Auto-detect" |
| **Profile Analyzer** | Go to your LinkedIn profile → open extension → Profile tab → Analyze |
| **Job Tracker** | Visit a job listing → open Tracker tab → "Track current job" |
| **Floating Button** | Appears on LinkedIn/Indeed job pages automatically |
| **Right-click Menu** | Right-click any job page → "Generate Cover Letter" |

---

## 🌐 Supported Sites

- `linkedin.com/jobs/*`
- `indeed.com`

To add more sites, update `host_permissions` and `content_scripts.matches` in `manifest.json`.

---

## 🛠 How It Works

```
User visits LinkedIn job page
        ↓
content.js detects job page → injects floating "AI Assist" button
        ↓
User clicks extension icon → popup.html opens
        ↓
User clicks "Auto-detect" → content.js scrapes job description
        ↓
User clicks "Generate" → popup.js calls Claude API
        ↓
Cover letter appears in the popup → user copies to clipboard
```

---

## 🔒 Privacy

- Your API key is stored **locally** in Chrome storage only
- No data is sent to any server except the Anthropic API directly
- Page content is only read when you explicitly request it
