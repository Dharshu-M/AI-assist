// ═══════════════════════════════════════════════════════
//  AI Career Assistant v2.0 — popup.js
// ═══════════════════════════════════════════════════════

// ── Tab Switching ────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('tab-btn-' + name).classList.add('active');
}

// ── Alert helper ─────────────────────────────────────────
function showAlert(id, msg, type = 'info', ms = 3500) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type} visible`;
  if (ms) setTimeout(() => el.classList.remove('visible'), ms);
}

// ── Toggle ───────────────────────────────────────────────
function wireToggle(id) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', () => el.classList.toggle('on'));
}

// ── Tone chips ───────────────────────────────────────────
let selectedTone = 'professional';
function wireToneChips() {
  document.querySelectorAll('.tone-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.tone-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedTone = chip.dataset.tone;
    });
  });
}

// ── Page status detection ────────────────────────────────
function detectPageStatus() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url || '';
    const el = document.getElementById('pageStatus');
    if (!el) return;
    if (url.includes('linkedin.com')) el.textContent = 'LinkedIn';
    else if (url.includes('indeed.com')) el.textContent = 'Indeed';
    else if (url.includes('glassdoor.com')) el.textContent = 'Glassdoor';
    else if (url.includes('naukri.com')) el.textContent = 'Naukri';
    else el.textContent = 'Ready';
  });
}

// ═══════════════════════════════════════════════════════
//  COVER LETTER
// ═══════════════════════════════════════════════════════

function autoDetectJob() {
  const btn = document.getElementById('autoDetectBtn');
  btn.textContent = '⏳ Detecting…';
  btn.disabled = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getJobDescription' }, (response) => {
      btn.textContent = '🔍 Auto-detect';
      btn.disabled = false;

      if (chrome.runtime.lastError || !response) {
        showAlert('coverAlert', 'Could not detect job on this page. Please paste manually.', 'error');
        return;
      }
      if (response.jobDescription) {
        document.getElementById('jobDesc').value = response.jobDescription;
        showAlert('coverAlert', '✅ Job description detected from page!', 'success');
      } else {
        showAlert('coverAlert', 'No job description found. Try pasting manually.', 'error');
      }
    });
  });
}

async function generateCoverLetter() {
  const jobDesc = document.getElementById('jobDesc').value.trim();
  if (!jobDesc) {
    showAlert('coverAlert', 'Please enter or detect a job description first.', 'error');
    return;
  }

  const userBg = document.getElementById('userBg').value.trim();
  const btn = document.getElementById('generateBtn');
  const resultBox = document.getElementById('resultBox');
  const resultSection = document.getElementById('resultSection');

  const stored = await chrome.storage.local.get(['groqApiKey']);
  if (!stored.groqApiKey) {
    showAlert('coverAlert', 'Please add your Groq API key in Settings first.', 'error');
    return;
  }

  btn.innerHTML = '<span class="spinner"></span> Generating…';
  btn.disabled = true;
  resultSection.style.display = 'none';

  const toneMap = {
    professional: 'professional and polished',
    enthusiastic: 'enthusiastic and energetic',
    concise: 'concise and direct (max 2 paragraphs)',
    creative: 'creative and memorable'
  };
  const toneInstruction = toneMap[selectedTone] || 'professional';
  const bgNote = userBg ? `\n\nCandidate background: ${userBg}` : '';

  const prompt = `Write a compelling cover letter that is ${toneInstruction}.
3 paragraphs. Be specific and confident. No placeholder brackets.
Do NOT include subject line or greeting formalities — start directly.${bgNote}

Job Description:
${jobDesc.slice(0, 2500)}`;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'callGroqAPI',
      apiKey: stored.groqApiKey,
      prompt,
      maxTokens: 900
    });

    if (!response || response.error) {
      showAlert('coverAlert', 'Error: ' + (response?.error || 'No response'), 'error');
      return;
    }

    const text = response.text || 'No response generated.';
    resultBox.textContent = text;
    resultSection.style.display = 'block';
    chrome.storage.local.set({ lastCoverLetter: text });

  } catch (err) {
    showAlert('coverAlert', 'Request failed: ' + err.message, 'error');
  } finally {
    btn.innerHTML = '✨ Generate Cover Letter';
    btn.disabled = false;
  }
}

function copyResult() {
  const text = document.getElementById('resultBox').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.innerHTML = '<span>✅</span> Copied!';
    setTimeout(() => { btn.innerHTML = '<span>📋</span> Copy'; }, 2000);
  });
}

function saveLetter() {
  const text = document.getElementById('resultBox').textContent;
  if (!text) return;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'cover-letter.txt'; a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════
//  TRACKER
// ═══════════════════════════════════════════════════════

function getBadgeClass(status) {
  const map = {
    'Wishlist': 'badge-wishlist',
    'Applied': 'badge-applied',
    'Interview': 'badge-interview',
    'Offer': 'badge-offer',
    'Rejected': 'badge-rejected'
  };
  return map[status] || 'badge-applied';
}

function renderTracker(filter = '') {
  chrome.storage.local.get(['applications'], (res) => {
    const apps = res.applications || [];
    const list = document.getElementById('trackerList');

    // Stats
    document.getElementById('stat-total').textContent = apps.length;
    document.getElementById('stat-interview').textContent = apps.filter(a => a.status === 'Interview').length;
    document.getElementById('stat-offer').textContent = apps.filter(a => a.status === 'Offer').length;

    const filtered = filter ? apps.filter(a => a.status === filter) : apps;

    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty"><div class="empty-icon">${filter ? '🔍' : '📭'}</div>${filter ? 'No ' + filter + ' applications.' : 'No applications yet.<br>Visit a job listing and click<br>"Track this job" below.'}</div>`;
      return;
    }

    list.innerHTML = filtered.map((app, i) => {
      const initials = app.company.slice(0, 2).toUpperCase();
      const date = app.date ? new Date(app.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      const realIndex = apps.indexOf(app);
      return `
        <div class="tracker-item" data-index="${realIndex}">
          <div class="company-logo">${initials}</div>
          <div class="tracker-info">
            <div class="tracker-company">${app.company}${app.source ? `<span class="source-badge">${app.source}</span>` : ''}</div>
            <div class="tracker-role">${app.role}</div>
            <div class="tracker-date">${date}</div>
          </div>
          <select class="tracker-badge ${getBadgeClass(app.status)}" data-index="${realIndex}" style="border:none;cursor:pointer;font-size:9.5px;padding:3px 6px;border-radius:20px;font-weight:600;appearance:none;text-align:center;min-width:62px">
            ${['Wishlist','Applied','Interview','Offer','Rejected'].map(s => `<option value="${s}"${s===app.status?' selected':''}>${s}</option>`).join('')}
          </select>
          <button class="delete-btn" data-index="${realIndex}" title="Remove">✕</button>
        </div>
      `;
    }).join('');

    // Status change
    list.querySelectorAll('select[data-index]').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index);
        apps[idx].status = e.target.value;
        chrome.storage.local.set({ applications: apps }, () => renderTracker(filter));
      });
    });

    // Delete
    list.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index);
        apps.splice(idx, 1);
        chrome.storage.local.set({ applications: apps }, () => renderTracker(filter));
      });
    });
  });
}

function addCurrentJob() {
  const btn = document.getElementById('addJobBtn');
  btn.textContent = '⏳ Detecting…';
  btn.disabled = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getJobTitle' }, (response) => {
      btn.textContent = '+ Track current job listing';
      btn.disabled = false;

      const company = response?.company || 'Unknown Company';
      const role = response?.role || 'Unknown Role';
      const source = response?.source || '';

      chrome.storage.local.get(['applications'], (res) => {
        const apps = res.applications || [];
        apps.unshift({ company, role, source, status: 'Applied', date: new Date().toISOString() });
        chrome.storage.local.set({ applications: apps }, () => renderTracker());
      });
    });
  });
}

// ═══════════════════════════════════════════════════════
//  PROFILE ANALYZER
// ═══════════════════════════════════════════════════════

async function analyzeProfile() {
  const stored = await chrome.storage.local.get(['groqApiKey']);
  if (!stored.groqApiKey) {
    alert('Please add your Groq API key in Settings first.');
    return;
  }

  const btn = document.getElementById('analyzeBtn');
  btn.innerHTML = '<span class="spinner"></span> Analyzing…';
  btn.disabled = true;

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getProfileText' }, async (response) => {
      const profileText = response?.profileText || 'Minimal profile data.';

      const prompt = `You are a LinkedIn profile optimizer. Analyze this profile and:
1. Give a score out of 100
2. List exactly 5 specific, actionable improvement tips

Respond ONLY in this JSON format, no extra text:
{"score": 72, "label": "Good", "tips": ["tip1","tip2","tip3","tip4","tip5"]}

Profile:
${profileText.slice(0, 2000)}`;

      try {
        const res = await chrome.runtime.sendMessage({
          action: 'callGroqAPI',
          apiKey: stored.groqApiKey,
          prompt,
          maxTokens: 400
        });

        if (!res || res.error) {
          alert('Analysis failed: ' + (res?.error || 'No response'));
          return;
        }

        const clean = (res.text || '{}').replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        const score = parsed.score || 0;

        // Update ring
        const circumference = 2 * Math.PI * 24; // 150.8
        const offset = circumference - (score / 100) * circumference;
        document.getElementById('scoreNum').textContent = score;
        document.getElementById('scoreLabel').textContent = parsed.label || (score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Work');
        document.getElementById('scoreDesc').textContent = `${score}/100 — tap tips below to improve`;
        setTimeout(() => {
          document.getElementById('scoreCircle').style.strokeDashoffset = offset;
          document.getElementById('scoreBar').style.width = score + '%';
        }, 100);

        const tipList = document.getElementById('tipList');
        tipList.innerHTML = (parsed.tips || []).map(tip =>
          `<li><span class="tip-icon">💡</span>${tip}</li>`
        ).join('');

      } catch (err) {
        alert('Parse error: ' + err.message);
      } finally {
        btn.innerHTML = '🔍 Analyze LinkedIn Profile';
        btn.disabled = false;
      }
    });
  });
}

// ═══════════════════════════════════════════════════════
//  AUTOFILL
// ═══════════════════════════════════════════════════════

function loadAutofillProfile() {
  chrome.storage.local.get(['autofillProfile'], (res) => {
    const p = res.autofillProfile || {};
    document.getElementById('af-name').value = p.name || '';
    document.getElementById('af-email').value = p.email || '';
    document.getElementById('af-phone').value = p.phone || '';
    document.getElementById('af-location').value = p.location || '';
    document.getElementById('af-linkedin').value = p.linkedin || '';
  });
}

function saveAutofillProfile() {
  const profile = {
    name: document.getElementById('af-name').value.trim(),
    email: document.getElementById('af-email').value.trim(),
    phone: document.getElementById('af-phone').value.trim(),
    location: document.getElementById('af-location').value.trim(),
    linkedin: document.getElementById('af-linkedin').value.trim()
  };
  chrome.storage.local.set({ autofillProfile: profile }, () => {
    showAlert('autofillAlert', '✅ Profile saved! Autofill is ready.', 'success');
  });
}

function autofillNow() {
  chrome.storage.local.get(['autofillProfile'], (res) => {
    const profile = res.autofillProfile;
    if (!profile || !profile.name) {
      showAlert('autofillAlert', 'Please save your profile first.', 'error');
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'autofill', profile }, (response) => {
        if (chrome.runtime.lastError || !response) {
          showAlert('autofillAlert', 'Could not autofill on this page.', 'error');
          return;
        }
        showAlert('autofillAlert', `✅ Filled ${response.filled || 0} field(s) successfully!`, 'success');
      });
    });
  });
}

// ═══════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════

function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key) { showAlert('settingsAlert', 'Please enter a valid Groq API key.', 'error'); return; }
  chrome.storage.local.set({ groqApiKey: key }, () => {
    showAlert('settingsAlert', '✅ API key saved!', 'success');
  });
}

function clearAllData() {
  if (!confirm('Delete all saved data including applications, cover letters, and settings?')) return;
  chrome.storage.local.clear(() => {
    showAlert('settingsAlert', '🗑 All data cleared.', 'info');
    renderTracker();
  });
}

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  detectPageStatus();
  wireToneChips();
  renderTracker();
  loadAutofillProfile();

  // Load saved API key
  chrome.storage.local.get(['groqApiKey'], (res) => {
    if (res.groqApiKey) document.getElementById('apiKeyInput').value = res.groqApiKey;
  });

  // Tabs
  ['cover','tracker','profile','autofill','settings'].forEach(name => {
    document.getElementById('tab-btn-' + name).addEventListener('click', () => switchTab(name));
  });

  // Cover
  document.getElementById('autoDetectBtn').addEventListener('click', autoDetectJob);
  document.getElementById('clearJobBtn').addEventListener('click', () => {
    document.getElementById('jobDesc').value = '';
    document.getElementById('resultSection').style.display = 'none';
  });
  document.getElementById('generateBtn').addEventListener('click', generateCoverLetter);
  document.getElementById('copyBtn').addEventListener('click', copyResult);
  document.getElementById('saveLetterBtn').addEventListener('click', saveLetter);

  // Tracker
  document.getElementById('addJobBtn').addEventListener('click', addCurrentJob);
  document.getElementById('filterStatus').addEventListener('change', (e) => renderTracker(e.target.value));

  // Profile
  document.getElementById('analyzeBtn').addEventListener('click', analyzeProfile);

  // Autofill
  document.getElementById('saveProfileBtn').addEventListener('click', saveAutofillProfile);
  document.getElementById('autofillNowBtn').addEventListener('click', autofillNow);

  // Settings
  document.getElementById('saveApiKeyBtn').addEventListener('click', saveApiKey);
  document.getElementById('clearDataBtn').addEventListener('click', clearAllData);
  ['toggle-autodetect','toggle-float','toggle-formal','toggle-save'].forEach(wireToggle);

  // Eye toggle for API key
  document.getElementById('toggleEye').addEventListener('click', () => {
    const inp = document.getElementById('apiKeyInput');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });
});
