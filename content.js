// content.js v2.0 — AI Career Assistant
// Runs on LinkedIn, Indeed, Glassdoor, Naukri

// ── Message Listener ─────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getJobDescription') {
    sendResponse({ jobDescription: extractJobDescription() });
  }
  if (request.action === 'getProfileText') {
    sendResponse({ profileText: extractProfileText() });
  }
  if (request.action === 'getJobTitle') {
    sendResponse(extractJobMeta());
  }
  if (request.action === 'autofill') {
    const filled = autofillForms(request.profile);
    sendResponse({ filled });
  }
  return true;
});

// ── Detect current site ──────────────────────────────────
function getSite() {
  const h = window.location.hostname;
  if (h.includes('linkedin')) return 'LinkedIn';
  if (h.includes('indeed')) return 'Indeed';
  if (h.includes('glassdoor')) return 'Glassdoor';
  if (h.includes('naukri')) return 'Naukri';
  return 'Other';
}

// ── Extract Job Description ──────────────────────────────
function extractJobDescription() {
  const selectors = [
    // LinkedIn
    '.jobs-description__content',
    '.jobs-box__html-content',
    '[data-test-id="job-description"]',
    '.description__text',
    '.jobs-description-content__text',
    // Indeed
    '#jobDescriptionText',
    '.jobsearch-jobDescriptionText',
    // Glassdoor
    '.JobDetails_jobDescription__uW_fK',
    '[class*="jobDescription"]',
    // Naukri
    '.job-desc',
    '.JDC_dang_jobDesc__ur8wJ',
    // Generic
    '[class*="job-description"]',
    '[id*="job-description"]',
    '[class*="jobDescription"]',
    '[id*="jobDescription"]',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim().length > 80) {
      return el.innerText.trim().slice(0, 3500);
    }
  }

  // Fallback: find largest text block
  let best = null, bestLen = 0;
  document.querySelectorAll('div, section, article').forEach(el => {
    const t = el.innerText?.trim();
    if (t && t.length > bestLen && t.length < 8000 &&
        (t.toLowerCase().includes('responsibilities') ||
         t.toLowerCase().includes('requirements') ||
         t.toLowerCase().includes('qualifications'))) {
      bestLen = t.length;
      best = t;
    }
  });
  return best ? best.slice(0, 3500) : null;
}

// ── Extract Profile Text ─────────────────────────────────
function extractProfileText() {
  const site = getSite();
  const sections = [];

  if (site === 'LinkedIn') {
    const headline = document.querySelector('.text-body-medium.break-words, .pv-text-details__left-panel .text-body-medium');
    if (headline) sections.push('Headline: ' + headline.innerText.trim());

    const name = document.querySelector('h1.text-heading-xlarge, .pv-text-details__left-panel h1');
    if (name) sections.push('Name: ' + name.innerText.trim());

    const about = document.querySelector('#about ~ * .display-flex span[aria-hidden="true"], .pv-about-section .pv-about__summary-text');
    if (about) sections.push('About: ' + about.innerText.trim().slice(0, 600));

    const experiences = document.querySelectorAll('.pvs-list__item--line-separated, .experience-section li');
    experiences.forEach((el, i) => {
      if (i < 4) sections.push('Experience ' + (i+1) + ': ' + el.innerText.trim().slice(0, 350));
    });

    const skills = document.querySelectorAll('.pv-skill-category-entity__name, .pvs-list__item--no-padding-in-columns');
    const skillTexts = [];
    skills.forEach((el, i) => { if (i < 10) skillTexts.push(el.innerText.trim()); });
    if (skillTexts.length) sections.push('Skills: ' + skillTexts.join(', '));
  }

  return sections.join('\n\n') || document.body.innerText.slice(0, 2000);
}

// ── Extract Job Meta ─────────────────────────────────────
function extractJobMeta() {
  let company = '', role = '';
  const site = getSite();

  if (site === 'LinkedIn') {
    const c = document.querySelector('.job-details-jobs-unified-top-card__company-name a, .jobs-unified-top-card__company-name a');
    const r = document.querySelector('.job-details-jobs-unified-top-card__job-title h1, .jobs-unified-top-card__job-title');
    if (c) company = c.innerText.trim();
    if (r) role = r.innerText.trim();
  } else if (site === 'Indeed') {
    const c = document.querySelector('[data-testid="inlineHeader-companyName"] span, .jobsearch-InlineCompanyRating span');
    const r = document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"], h1.jobsearch-JobInfoHeader-title');
    if (c) company = c.innerText.trim();
    if (r) role = r.innerText.trim();
  } else if (site === 'Glassdoor') {
    const c = document.querySelector('[data-test="employer-name"], .employer-name');
    const r = document.querySelector('[data-test="job-title"], .job-title');
    if (c) company = c.innerText.trim();
    if (r) role = r.innerText.trim();
  } else if (site === 'Naukri') {
    const c = document.querySelector('.jd-header-comp-name a, .comp-name');
    const r = document.querySelector('h1.title, .jd-header-title');
    if (c) company = c.innerText.trim();
    if (r) role = r.innerText.trim();
  }

  // Fallback
  if (!company) company = document.querySelector('[class*="company"]')?.innerText?.trim() || window.location.hostname;
  if (!role) role = document.querySelector('h1')?.innerText?.trim() || document.title.slice(0, 60);

  return { company, role, source: site };
}

// ── Autofill ─────────────────────────────────────────────
function autofillForms(profile) {
  let filled = 0;

  const fieldMap = [
    { keys: ['name', 'full.name', 'fullname', 'applicant.name'], value: profile.name },
    { keys: ['email', 'e-mail', 'emailaddress'], value: profile.email },
    { keys: ['phone', 'mobile', 'telephone', 'contact'], value: profile.phone },
    { keys: ['location', 'city', 'address'], value: profile.location },
    { keys: ['linkedin', 'linkedin.url', 'linkedinurl'], value: profile.linkedin },
  ];

  document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input:not([type])').forEach(inp => {
    const identifier = (inp.name + ' ' + inp.id + ' ' + inp.placeholder + ' ' + (inp.getAttribute('aria-label') || '')).toLowerCase();
    for (const field of fieldMap) {
      if (field.value && field.keys.some(k => identifier.includes(k))) {
        if (!inp.value) {
          inp.value = field.value;
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          filled++;
          break;
        }
      }
    }
  });

  return filled;
}

// ── Floating Button ──────────────────────────────────────
function injectFloatingButton() {
  if (document.getElementById('ai-career-float')) return;

  const btn = document.createElement('div');
  btn.id = 'ai-career-float';
  btn.innerHTML = `
    <div id="ai-career-fab">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
      <span>AI Assist</span>
    </div>
    <div id="ai-career-tooltip">Click to generate a cover letter</div>
  `;
  btn.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'openPopup' }));
  document.body.appendChild(btn);
}

// Inject on job pages
const url = window.location.href;
const isJobPage = url.includes('/jobs/') || url.includes('indeed.com') ||
                  url.includes('glassdoor.com/job') || url.includes('naukri.com') ||
                  document.querySelector('.jobs-description__content, #jobDescriptionText') !== null;
if (isJobPage) setTimeout(injectFloatingButton, 1800);
