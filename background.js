// background.js v2.0 — Service Worker

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'generate-cover-letter',
    title: '✨ Generate Cover Letter (AI Career Assistant)',
    contexts: ['page', 'selection'],
    documentUrlPatterns: [
      'https://www.linkedin.com/*',
      'https://indeed.com/*',
      'https://www.indeed.com/*',
      'https://www.glassdoor.com/*',
      'https://naukri.com/*',
      'https://www.naukri.com/*'
    ]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'generate-cover-letter') {
    chrome.action.openPopup?.().catch(() => {
      chrome.action.setBadgeText({ text: '✨', tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({ color: '#4361ee', tabId: tab.id });
      setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tab.id }), 4000);
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openPopup') {
    chrome.action.setBadgeText({ text: '!', tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#4361ee', tabId: sender.tab.id });
    setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: sender.tab.id }), 4000);
  }

  // ── Groq API (FREE — LLaMA 3.3 70B) ─────────────────
  if (request.action === 'callGroqAPI') {
    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${request.apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: request.prompt }],
        max_tokens: request.maxTokens || 800,
        temperature: 0.72
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        sendResponse({ error: data.error.message });
      } else {
        sendResponse({ text: data.choices?.[0]?.message?.content || '' });
      }
    })
    .catch(err => sendResponse({ error: err.message }));

    return true;
  }

  return true;
});
