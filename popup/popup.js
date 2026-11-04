// popup/popup.js
const ICON_BASE_URL = 'https://raw.githubusercontent.com/enthec/webappanalyzer/main/src/images/icons/';
const FALLBACK_ICON = '../assets/logo.svg';

const EXTERNAL_ARROW_SVG = `
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M7 17L17 7" />
    <path d="M7 7h10v10" />
  </svg>
`;

let currentReport = null;
let activeTabId = null;
let searchFilter = '';

const domDomain = document.getElementById('current-domain');
const statusPill = document.getElementById('scan-status-pill');
const statTechCount = document.getElementById('stat-tech-count');
const statDnsCount = document.getElementById('stat-dns-count');
const statCveCount = document.getElementById('stat-cve-count');
const statLeadCount = document.getElementById('stat-lead-count');

const techContainer = document.getElementById('tech-list-container');
const infraContainer = document.getElementById('infra-container');
const securityContainer = document.getElementById('security-container');
const leadsContainer = document.getElementById('leads-container');

const searchInput = document.getElementById('tech-search');
const clearSearchBtn = document.getElementById('btn-clear-search');
const searchKbdHint = document.getElementById('search-kbd-hint');
const rescanBtn = document.getElementById('btn-rescan');
const themeToggleBtn = document.getElementById('btn-theme-toggle');
const toastEl = document.getElementById('toast');

// ---------------------------------------------------------------------------
// Theme Management (Dark / Light Mode with instant load & storage persistence)
// ---------------------------------------------------------------------------
function applyTheme(theme) {
  const validTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', validTheme);
  try {
    localStorage.setItem('stacklens_theme', validTheme);
    chrome.storage?.local?.set({ stacklens_theme: validTheme });
  } catch {}
}

// Apply saved theme immediately on startup
(function initTheme() {
  const savedLocal = localStorage.getItem('stacklens_theme');
  if (savedLocal === 'light' || savedLocal === 'dark') {
    document.documentElement.setAttribute('data-theme', savedLocal);
  } else {
    chrome.storage?.local?.get('stacklens_theme', (res) => {
      if (res?.stacklens_theme) {
        applyTheme(res.stacklens_theme);
      }
    });
  }
})();

themeToggleBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  showToast(`Switched to ${next === 'light' ? 'Light' : 'Dark'} mode`);
});

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 1800);
}

function renderSkeletonRows(count = 5, twoCol = false) {
  if (twoCol) {
    return `
      <div class="skeleton-grid" aria-busy="true" aria-label="Loading analysis data">
        ${Array.from({ length: count * 2 })
          .map(() => `<div class="skeleton-line"></div>`)
          .join('')}
      </div>
    `;
  }
  return `
    <div class="skeleton-stack" aria-busy="true" aria-label="Loading analysis data">
      ${Array.from({ length: count })
        .map(() => `<div class="skeleton-line"></div>`)
        .join('')}
    </div>
  `;
}

// Show initial skeleton states
techContainer.innerHTML = renderSkeletonRows(4, true);
infraContainer.innerHTML = renderSkeletonRows(5);
securityContainer.innerHTML = renderSkeletonRows(4);
leadsContainer.innerHTML = renderSkeletonRows(4);

// Tab Switching + Arrow Key Navigation
const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
function activateTab(btn) {
  const targetId = btn.getAttribute('data-tab');
  tabButtons.forEach((b) => {
    const active = b === btn;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === targetId);
  });
}

tabButtons.forEach((btn, idx) => {
  btn.addEventListener('click', () => activateTab(btn));
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextIdx = (idx + (e.key === 'ArrowRight' ? 1 : -1) + tabButtons.length) % tabButtons.length;
      tabButtons[nextIdx].focus();
      activateTab(tabButtons[nextIdx]);
    }
  });
});

// Keyboard shortcuts: '/' focuses search, 'Escape' clears search
window.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault();
    activateTab(document.getElementById('tabbtn-tech'));
    searchInput.focus();
  }
});

function updateSearchFilter(val) {
  searchFilter = val.trim().toLowerCase();
  const hasText = searchFilter.length > 0;
  clearSearchBtn.classList.toggle('hidden', !hasText);
  searchKbdHint.classList.toggle('hidden', hasText);
  if (currentReport) {
    renderTechStack(currentReport.technologies || []);
  }
}

searchInput.addEventListener('input', (e) => updateSearchFilter(e.target.value));
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && searchInput.value) {
    e.preventDefault();
    searchInput.value = '';
    updateSearchFilter('');
  }
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  updateSearchFilter('');
  searchInput.focus();
});

// Rescan Button
rescanBtn.addEventListener('click', () => {
  if (!activeTabId) return;
  rescanBtn.classList.add('is-spinning');
  statusPill.textContent = 'SCANNING';
  statusPill.className = 'status-pill status-scanning';
  showToast('Rescanning active page...');
  chrome.runtime.sendMessage({ action: 'RESCAN_TAB', tabId: activeTabId });
  setTimeout(() => rescanBtn.classList.remove('is-spinning'), 700);
});

// Export JSON
document.getElementById('btn-export-json').addEventListener('click', () => {
  if (!currentReport) {
    showToast('Wait for scan to finish before exporting');
    return;
  }
  const blob = new Blob([JSON.stringify(currentReport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const safeHost = (currentReport.hostname || 'site').replace(/[^a-z0-9.-]/gi, '_');
  const a = document.createElement('a');
  a.href = url;
  a.download = `stacklens_${safeHost}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported JSON report');
});

// Export CSV
document.getElementById('btn-export-csv').addEventListener('click', () => {
  if (!currentReport) {
    showToast('Wait for scan to finish before exporting');
    return;
  }

  const rows = [
    ['Section', 'Category / Type', 'Name / Key', 'Version / Value', 'Confidence / Severity', 'Website / Info']
  ];

  for (const t of currentReport.technologies || []) {
    rows.push([
      'Technology',
      (t.categories || []).join('; ') || 'Uncategorized',
      t.name,
      t.version || '',
      `${t.confidence}%`,
      t.website || ''
    ]);
  }

  const ip = currentReport.infrastructure?.ip;
  if (ip) {
    rows.push(['Infrastructure', 'IP Info', 'IP Address', ip.ip || '', '', `${ip.isp || ''} (${ip.country || ''})`]);
    rows.push(['Infrastructure', 'IP Info', 'ASN / Org', String(ip.asn || ''), '', ip.org || '']);
  }

  const dns = currentReport.infrastructure?.dns || {};
  for (const [type, list] of Object.entries(dns)) {
    for (const val of list || []) {
      rows.push(['DNS', type, currentReport.hostname || '', val, '', '']);
    }
  }

  for (const sec of currentReport.security || []) {
    for (const v of sec.vulnerabilities || []) {
      rows.push([
        'Security (CVE)',
        sec.technology,
        v.id,
        sec.version || '',
        v.severity || '',
        v.summary || ''
      ]);
    }
  }

  for (const email of currentReport.leads?.emails || []) {
    rows.push(['Leads', 'Email', email, '', '', '']);
  }
  for (const [platform, link] of Object.entries(currentReport.leads?.socials || {})) {
    rows.push(['Leads', 'Social', platform, link, '', '']);
  }

  const csvContent = rows
    .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const safeHost = (currentReport.hostname || 'site').replace(/[^a-z0-9.-]/gi, '_');
  const a = document.createElement('a');
  a.href = url;
  a.download = `stacklens_${safeHost}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported CSV report');
});

function bindCopyButtons(container) {
  container.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy');
      try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard');
      } catch {
        showToast('Clipboard access failed');
      }
    });
  });
}

function renderCategoryBlockHtml(category, items) {
  return `
    <div class="group-block">
      <div class="group-header">
        <h2 class="group-title" title="${escapeHtml(category)}">${escapeHtml(category)}</h2>
        <span class="group-meta">${items.length}</span>
      </div>
      <div class="surface-list">
        ${items
          .map((t) => {
            const iconUrl = !t.icon
              ? FALLBACK_ICON
              : t.icon.startsWith('data:') || t.icon.startsWith('http') || t.icon.startsWith('../')
              ? t.icon
              : `${ICON_BASE_URL}${encodeURIComponent(t.icon)}`;
            const versionBadge = t.version
              ? `<span class="badge-version" title="v${escapeHtml(t.version)}">v${escapeHtml(t.version)}</span>`
              : '';
            const confidenceBadge =
              t.confidence && t.confidence < 100
                ? `<span class="badge-confidence">${t.confidence}%</span>`
                : '';
            const titleHtml = t.website
              ? `<a href="${escapeHtml(t.website)}" target="_blank" rel="noopener noreferrer" class="tech-link" title="${escapeHtml(t.name)}">
                  <span>${escapeHtml(t.name)}</span>
                  ${EXTERNAL_ARROW_SVG}
                </a>`
              : `<span class="tech-link" title="${escapeHtml(t.name)}"><span>${escapeHtml(t.name)}</span></span>`;

            return `
              <div class="tech-row">
                <div class="tech-identity">
                  <div class="tech-icon-well">
                    <img src="${iconUrl}" alt="${escapeHtml(t.name)} icon" class="tech-icon" width="15" height="15" />
                  </div>
                  ${titleHtml}
                </div>
                <div class="tech-badges">
                  ${versionBadge}
                  ${confidenceBadge}
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

// Tab 1: Tech Stack (Balanced 2-Column Masonry Layout)
function renderTechStack(technologies) {
  const filtered = technologies.filter((t) => {
    if (!searchFilter) return true;
    const inName = t.name.toLowerCase().includes(searchFilter);
    const inCat = (t.categories || []).some((c) => c.toLowerCase().includes(searchFilter));
    return inName || inCat;
  });

  if (filtered.length === 0) {
    techContainer.innerHTML = searchFilter
      ? `
        <div class="empty-box">
          <p class="empty-box-title">No matching technologies</p>
          <p class="empty-box-desc">No detected technology or category matches "${escapeHtml(searchFilter)}". Press Esc to clear the filter.</p>
        </div>
      `
      : `
        <div class="empty-box">
          <p class="empty-box-title">No fingerprints matched yet</p>
          <p class="empty-box-desc">Click the Rescan button in the top bar or reload the page to capture headers, scripts, and DOM signatures.</p>
        </div>
      `;
    return;
  }

  const grouped = new Map();
  for (const tech of filtered) {
    const cats = tech.categories && tech.categories.length > 0 ? tech.categories : ['Miscellaneous'];
    for (const cat of cats) {
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat).push(tech);
    }
  }

  // Distribute category groups across 2 balanced columns by visual height weight
  const leftColHtml = [];
  const rightColHtml = [];
  let leftWeight = 0;
  let rightWeight = 0;

  for (const [category, items] of grouped.entries()) {
    const blockHtml = renderCategoryBlockHtml(category, items);
    // Header weight ~1 + items.length rows
    const weight = 1 + items.length;
    if (leftWeight <= rightWeight) {
      leftColHtml.push(blockHtml);
      leftWeight += weight;
    } else {
      rightColHtml.push(blockHtml);
      rightWeight += weight;
    }
  }

  techContainer.innerHTML = `
    <div class="tech-columns">
      <div class="tech-column">${leftColHtml.join('')}</div>
      <div class="tech-column">${rightColHtml.join('')}</div>
    </div>
  `;

  techContainer.querySelectorAll('img.tech-icon').forEach((img) => {
    img.addEventListener(
      'error',
      () => {
        if (img.src !== FALLBACK_ICON) {
          img.src = FALLBACK_ICON;
        }
      },
      { once: true }
    );
  });
}

// Tab 2: Infra & DNS
function renderInfrastructure(infra, loadingPlus) {
  if (!infra) {
    infraContainer.innerHTML = renderSkeletonRows(4);
    return;
  }

  const ip = infra.ip;
  const dns = infra.dns || {};
  const headers = infra.headers || {};

  const ipHtml = ip
    ? `
      <div class="data-row">
        <span class="data-label">IPv4 Address</span>
        <span class="data-value">${escapeHtml(ip.ip)}</span>
        <button class="action-chip-btn" type="button" data-copy="${escapeHtml(ip.ip)}">Copy</button>
      </div>
      <div class="data-row">
        <span class="data-label">ISP / Host</span>
        <span class="data-value data-value-sans">${escapeHtml(ip.isp || ip.org || 'Unlisted')}</span>
        <span></span>
      </div>
      <div class="data-row">
        <span class="data-label">Organization</span>
        <span class="data-value data-value-sans">${escapeHtml(ip.org || 'Unlisted')}</span>
        <span></span>
      </div>
      <div class="data-row">
        <span class="data-label">ASN</span>
        <span class="data-value">${ip.asn ? `AS${escapeHtml(ip.asn)}` : 'Unlisted'}</span>
        <span></span>
      </div>
      <div class="data-row">
        <span class="data-label">Geo Location</span>
        <span class="data-value data-value-sans">${escapeHtml([ip.city, ip.region, ip.country].filter(Boolean).join(', ') || 'Unlisted')}</span>
        <span></span>
      </div>
    `
    : `<p class="inline-note">${
        loadingPlus ? 'Resolving host IPv4 and ASN intelligence...' : 'No public IPv4 address resolved for this hostname.'
      }</p>`;

  const dnsTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT'];
  const populatedDns = dnsTypes.filter((t) => Array.isArray(dns[t]) && dns[t].length > 0);

  const dnsHtml =
    populatedDns.length > 0
      ? populatedDns
          .map(
            (type) => `
            <div class="dns-row">
              <span class="dns-type">${type}</span>
              <div class="dns-values">
                ${dns[type].map((rec) => `<span>${escapeHtml(rec)}</span>`).join('')}
              </div>
            </div>
          `
          )
          .join('')
      : `<p class="inline-note">${
          loadingPlus ? 'Querying Cloudflare DoH (1.1.1.1)...' : 'No public DNS records returned for this domain.'
        }</p>`;

  const headerEntries = Object.entries(headers);
  const headersHtml =
    headerEntries.length > 0
      ? headerEntries
          .slice(0, 30)
          .map(
            ([k, v]) => `
            <div class="data-row">
              <span class="data-label" title="${escapeHtml(k)}">${escapeHtml(k)}</span>
              <span class="data-value">${escapeHtml(v)}</span>
              <span></span>
            </div>
          `
          )
          .join('')
      : `<p class="inline-note">Reload the current tab to capture live HTTP response headers.</p>`;

  infraContainer.innerHTML = `
    <div class="group-block">
      <div class="group-header">
        <h2 class="group-title">IP &amp; Network Intelligence</h2>
        <span class="group-meta">ipwho.is</span>
      </div>
      <div class="surface-list">${ipHtml}</div>
    </div>

    <div class="group-block">
      <div class="group-header">
        <h2 class="group-title">DNS Records (DoH)</h2>
        <span class="group-meta">Cloudflare 1.1.1.1</span>
      </div>
      <div class="surface-list">${dnsHtml}</div>
    </div>

    <div class="group-block">
      <div class="group-header">
        <h2 class="group-title">HTTP Response Headers</h2>
        <span class="group-meta">${headerEntries.length} captured</span>
      </div>
      <div class="surface-list">${headersHtml}</div>
    </div>
  `;

  bindCopyButtons(infraContainer);
}

// Tab 3: Security (CVE)
function renderSecurity(security = [], technologies = [], loadingPlus = false) {
  const versionedTechs = technologies.filter((t) => t.version);

  if (loadingPlus) {
    securityContainer.innerHTML = renderSkeletonRows(4);
    return;
  }

  const totalVulns = security.reduce((sum, item) => sum + (item.vulnerabilities?.length || 0), 0);
  let html = '';

  if (totalVulns === 0) {
    html += `
      <div class="audit-banner is-safe">
        <svg class="audit-banner-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
        <div>
          <p class="audit-banner-title">No Known CVEs Matched</p>
          <p class="audit-banner-desc">Audited ${versionedTechs.length} version-fingerprinted ${
      versionedTechs.length === 1 ? 'package' : 'packages'
    } against the OSV.dev advisory database.</p>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="audit-banner is-vulnerable">
        <svg class="audit-banner-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
          <p class="audit-banner-title">${totalVulns} ${totalVulns === 1 ? 'Vulnerability' : 'Vulnerabilities'} Detected</p>
          <p class="audit-banner-desc">Found across ${security.length} outdated client-side or server-side ${
      security.length === 1 ? 'library' : 'libraries'
    }.</p>
        </div>
      </div>
    `;

    for (const item of security) {
      html += `
        <div class="group-block">
          <div class="group-header">
            <h2 class="group-title">${escapeHtml(item.technology)}</h2>
            <span class="badge-version">v${escapeHtml(item.version)}</span>
          </div>
          <div class="surface-list">
            ${item.vulnerabilities
              .map((v) => {
                const sev = escapeHtml(v.severity || 'ADVISORY');
                return `
                  <div class="vuln-row">
                    <div class="vuln-top">
                      <a href="https://osv.dev/vulnerability/${encodeURIComponent(v.id)}" target="_blank" rel="noopener noreferrer" class="vuln-id-link">
                        <span>${escapeHtml(v.id)}</span>
                        ${EXTERNAL_ARROW_SVG}
                      </a>
                      <span class="severity-pill sev-${sev}">${sev}</span>
                    </div>
                    <p class="vuln-summary">${escapeHtml(v.summary)}</p>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    }
  }

  html += `
    <div class="group-block">
      <div class="group-header">
        <h2 class="group-title">Versioned Packages Audited</h2>
        <span class="group-meta">${versionedTechs.length} packages</span>
      </div>
      <div class="surface-list">
        ${
          versionedTechs.length > 0
            ? versionedTechs
                .map(
                  (t) => `
                  <div class="data-row">
                    <span class="data-label">${escapeHtml(t.name)}</span>
                    <span class="data-value">v${escapeHtml(t.version)}</span>
                    <span></span>
                  </div>
                `
                )
                .join('')
            : `<p class="inline-note">No explicit version strings were exposed by the technologies on this page.</p>`
        }
      </div>
    </div>
  `;

  securityContainer.innerHTML = html;
}

// Tab 4: Leads & Meta
function renderLeads(leads = {}) {
  const emails = leads.emails || [];
  const phones = leads.phones || [];
  const socials = leads.socials || {};
  const schemaOrg = leads.schemaOrg || [];
  const socialEntries = Object.entries(socials);

  const contacts = [
    ...emails.map((e) => ({ type: 'Email', value: e })),
    ...phones.map((p) => ({ type: 'Phone', value: p }))
  ];

  const contactsHtml =
    contacts.length > 0
      ? contacts
          .map(
            (c) => `
            <div class="contact-row">
              <span class="contact-value" title="${escapeHtml(c.value)}">${escapeHtml(c.value)}</span>
              <button class="action-chip-btn" type="button" data-copy="${escapeHtml(c.value)}">Copy</button>
            </div>
          `
          )
          .join('')
      : `<p class="inline-note">No email addresses or phone links exposed in page DOM.</p>`;

  const socialsHtml =
    socialEntries.length > 0
      ? `<div class="social-grid">
          ${socialEntries
            .map(
              ([platform, url]) => `
              <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="social-link-card">
                <span>${escapeHtml(platform)}</span>
                ${EXTERNAL_ARROW_SVG}
              </a>
            `
            )
            .join('')}
        </div>`
      : `<div class="surface-list"><p class="inline-note">No social profile links detected on this page.</p></div>`;

  const schemaJson = schemaOrg.length > 0 ? JSON.stringify(schemaOrg, null, 2) : '';
  const schemaHtml =
    schemaOrg.length > 0
      ? `<pre class="code-viewer">${escapeHtml(schemaJson)}</pre>`
      : `<div class="surface-list"><p class="inline-note">No application/ld+json Schema.org blocks present.</p></div>`;

  leadsContainer.innerHTML = `
    <div class="group-block">
      <div class="group-header">
        <h2 class="group-title">Site Identity &amp; OpenGraph</h2>
      </div>
      <div class="surface-list">
        <div class="data-row">
          <span class="data-label">Site Title</span>
          <span class="data-value data-value-sans">${escapeHtml(leads.siteName || 'Unlisted')}</span>
          <span></span>
        </div>
        <div class="data-row">
          <span class="data-label">Description</span>
          <span class="data-value data-value-sans">${escapeHtml(leads.description || 'No meta description provided.')}</span>
          <span></span>
        </div>
      </div>
    </div>

    <div class="group-block">
      <div class="group-header">
        <h2 class="group-title">Extracted Contacts (${contacts.length})</h2>
        ${
          emails.length > 1
            ? `<button class="action-chip-btn" type="button" data-copy="${escapeHtml(emails.join(', '))}">Copy All Emails</button>`
            : ''
        }
      </div>
      <div class="surface-list">${contactsHtml}</div>
    </div>

    <div class="group-block">
      <div class="group-header">
        <h2 class="group-title">Social Profiles (${socialEntries.length})</h2>
      </div>
      ${socialsHtml}
    </div>

    <div class="group-block">
      <div class="group-header">
        <h2 class="group-title">Schema.org (JSON-LD)</h2>
        ${
          schemaOrg.length > 0
            ? `<button class="action-chip-btn" type="button" data-copy="${escapeHtml(schemaJson)}">Copy JSON</button>`
            : `<span class="group-meta">0 blocks</span>`
        }
      </div>
      ${schemaHtml}
    </div>
  `;

  bindCopyButtons(leadsContainer);
}

// Render Full Report
function renderReport(report) {
  currentReport = report;
  if (!report) return;

  domDomain.textContent = report.hostname || report.url || 'Unknown host';
  if (report.loadingPlus) {
    statusPill.textContent = 'SYNCING';
    statusPill.className = 'status-pill status-scanning';
  } else {
    statusPill.textContent = 'LIVE';
    statusPill.className = 'status-pill status-ready';
  }

  const techCount = report.technologies?.length || 0;
  const dnsObj = report.infrastructure?.dns || {};
  const dnsCount = Object.values(dnsObj).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
  const cveCount = (report.security || []).reduce((acc, item) => acc + (item.vulnerabilities?.length || 0), 0);
  const leadCount =
    (report.leads?.emails?.length || 0) +
    (report.leads?.phones?.length || 0) +
    Object.keys(report.leads?.socials || {}).length;

  statTechCount.textContent = String(techCount);
  statDnsCount.textContent = String(dnsCount);
  statCveCount.textContent = String(cveCount);
  statLeadCount.textContent = String(leadCount);
  statCveCount.classList.toggle('has-alert', cveCount > 0);

  renderTechStack(report.technologies || []);
  renderInfrastructure(report.infrastructure, report.loadingPlus);
  renderSecurity(report.security || [], report.technologies || [], report.loadingPlus);
  renderLeads(report.leads || {});
}

// Initialize Popup
async function initPopup() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    domDomain.textContent = 'No active tab';
    return;
  }

  activeTabId = tab.id;

  if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
    domDomain.textContent = 'Browser Internal Page';
    statusPill.textContent = 'IDLE';
    const msgHtml = `
      <div class="empty-box">
        <p class="empty-box-title">HTTP/HTTPS Target Required</p>
        <p class="empty-box-desc">Open any public website tab to inspect its technology stack, DNS records, CVE posture, and lead metadata.</p>
      </div>
    `;
    techContainer.innerHTML = msgHtml;
    infraContainer.innerHTML = msgHtml;
    securityContainer.innerHTML = msgHtml;
    leadsContainer.innerHTML = msgHtml;
    return;
  }

  try {
    const urlObj = new URL(tab.url);
    domDomain.textContent = urlObj.hostname;
  } catch {}

  const key = `report_${activeTabId}`;
  const stored = await chrome.storage.local.get(key);
  if (stored[key]) {
    renderReport(stored[key]);
  } else {
    statusPill.textContent = 'SCANNING';
    statusPill.className = 'status-pill status-scanning';
    chrome.runtime.sendMessage({ action: 'RESCAN_TAB', tabId: activeTabId });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[key]?.newValue) {
      renderReport(changes[key].newValue);
    }
  });
}

initPopup();
