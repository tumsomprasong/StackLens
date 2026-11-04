// src/background.js
import { analyzePage, buildDomQueryDescriptors } from './matcher.js';

let technologies = {};
let categories = {};
let allJsPaths = [];
let domDescriptors = [];
let dbLoadedPromise = null;
const tabHeaders = new Map();
const tabRequests = new Map();

// โหลดฐานข้อมูล JSON ตอนเริ่มต้น
async function loadDatabase() {
  if (dbLoadedPromise) return dbLoadedPromise;
  dbLoadedPromise = (async () => {
    try {
      const [techRes, catRes] = await Promise.all([
        fetch(chrome.runtime.getURL('rules/technologies.json')),
        fetch(chrome.runtime.getURL('rules/categories.json'))
      ]);
      technologies = await techRes.json();
      categories = await catRes.json();

      const jsSet = new Set();
      for (const rule of Object.values(technologies)) {
        if (rule.js) {
          Object.keys(rule.js).forEach((k) => jsSet.add(k));
        }
      }
      allJsPaths = Array.from(jsSet);
      domDescriptors = buildDomQueryDescriptors(technologies);
      console.log(
        `[StackLens] Loaded ${Object.keys(technologies).length} technologies, ${allJsPaths.length} JS paths, ${domDescriptors.length} DOM selectors.`
      );
    } catch (err) {
      console.error('[StackLens] Failed to load rules:', err);
      dbLoadedPromise = null;
    }
  })();
  return dbLoadedPromise;
}
loadDatabase();

// รายชื่อ Header สำคัญของฝั่ง Server ที่อนุญาตให้ดึงเสริมจาก Sub-requests บนโดเมนเดียวกันได้
const SERVER_SIGNAL_HEADERS = new Set([
  'server',
  'x-powered-by',
  'x-aspnet-version',
  'x-aspnetmvc-version',
  'x-feserver',
  'x-beserver',
  'x-calculatedbetarget',
  'x-diaginfo',
  'x-server',
  'x-backend-server',
  'x-origin-server',
  'x-generator',
  'x-drupal-cache',
  'x-varnish',
  'x-turbo-charged-by',
  'x-amz-cf-id',
  'x-azure-ref',
  'x-auth0-requestid',
  'content-security-policy',
  'location',
  'cf-ray',
  'via',
  'set-cookie'
]);

function recordTabUrl(tabId, url) {
  if (tabId < 0 || !url) return;
  let set = tabRequests.get(tabId);
  if (!set) {
    set = new Set();
    tabRequests.set(tabId, set);
  }
  if (set.size < 250) {
    set.add(url);
  }
}

// ดักจับ HTTP Headers และ URLs ของแท็บปัจจุบัน (รวมถึง OAuth / OIDC Redirects และ XHRs)
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.tabId < 0) return;
    recordTabUrl(details.tabId, details.url);

    if (!details.responseHeaders) return;

    if (details.type === 'main_frame') {
      const headers = {};
      let host = '';
      try {
        host = new URL(details.url).hostname;
      } catch {}
      headers.__host = host;

      for (const h of details.responseHeaders) {
        const name = h.name.toLowerCase();
        const val = h.value || '';
        if (name === 'location' && val) {
          recordTabUrl(details.tabId, val);
        }
        if (headers[name]) {
          if (!headers[name].includes(val)) {
            headers[name] += `, ${val}`;
          }
        } else {
          headers[name] = val;
        }
      }
      tabHeaders.set(details.tabId, headers);
    } else {
      const existing = tabHeaders.get(details.tabId);
      let reqHost = '';
      try {
        reqHost = new URL(details.url).hostname;
      } catch {}

      for (const h of details.responseHeaders) {
        if (h.name.toLowerCase() === 'location' && h.value) {
          recordTabUrl(details.tabId, h.value);
        }
      }

      if (existing && existing.__host && reqHost === existing.__host) {
        for (const h of details.responseHeaders) {
          const name = h.name.toLowerCase();
          const val = h.value || '';
          if (SERVER_SIGNAL_HEADERS.has(name) && val) {
            if (!existing[name]) {
              existing[name] = val;
            } else if (!existing[name].includes(val)) {
              existing[name] += `, ${val}`;
            }
          }
        }
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// ล้างข้อมูลเมื่อปิดแท็บ
chrome.tabs.onRemoved.addListener((tabId) => {
  tabHeaders.delete(tabId);
  tabRequests.delete(tabId);
  chrome.storage.local.remove(`report_${tabId}`);
});

// ถอดรหัส JWT Payload จาก HttpOnly Cookies (เช่น KEYCLOAK_IDENTITY, session_token, access_token)
function extractJwtClaimsFromCookies(cookiesObj) {
  const claims = [];
  const jwtRegex = /eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g;
  for (const rawVal of Object.values(cookiesObj)) {
    let val = rawVal;
    try {
      val = decodeURIComponent(rawVal);
    } catch {}
    let m;
    while ((m = jwtRegex.exec(val)) !== null) {
      try {
        const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(b64));
        if (payload && typeof payload === 'object') {
          claims.push({
            iss: typeof payload.iss === 'string' ? payload.iss : '',
            aud: typeof payload.aud === 'string' ? payload.aud : '',
            azp: typeof payload.azp === 'string' ? payload.azp : '',
            typ: typeof payload.typ === 'string' ? payload.typ : '',
            keys: Object.keys(payload)
          });
        }
      } catch {}
    }
  }
  return claims;
}

// ตรวจสอบ /api/auth/providers สำหรับเว็บไซต์ที่ใช้ Next.js / NextAuth.js เพื่อค้นหา OAuth/OIDC Provider (เช่น Keycloak)
async function probeNextAuthProviders(pageUrl) {
  try {
    const u = new URL(pageUrl);
    const origin = u.origin;
    return await getWithCache(`nextauth_providers_${u.hostname}`, async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1800);
      try {
        const res = await fetch(`${origin}/api/auth/providers`, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: controller.signal
        });
        if (!res.ok) return [];
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return [];
        const data = await res.json();
        if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
        return Object.values(data)
          .filter((p) => p && typeof p === 'object' && (p.id || p.name || p.signinUrl))
          .map((p) => ({
            id: p.id || '',
            name: p.name || '',
            type: p.type || '',
            signinUrl: p.signinUrl || '',
            callbackUrl: p.callbackUrl || ''
          }));
      } catch {
        return [];
      } finally {
        clearTimeout(timer);
      }
    });
  } catch {
    return [];
  }
}

// Active Header Probe: หากแท็บถูกเปิดไว้ก่อนแล้ว หรือโหลดจาก Cache ทำให้ไม่มี HTTP Headers ให้ยิง HEAD/GET ไปดึง Headers สดทันที
async function ensurePageHeaders(tabId, url) {
  const existing = { ...(tabHeaders.get(tabId) || {}) };
  delete existing.__host;

  if (existing['server'] && existing['x-powered-by']) {
    return existing;
  }

  const probe = async (method) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(url, {
        method,
        cache: 'no-store',
        credentials: 'include',
        redirect: 'follow',
        signal: controller.signal
      });
      const merged = { ...existing };
      res.headers.forEach((val, key) => {
        const lower = key.toLowerCase();
        if (!merged[lower]) {
          merged[lower] = val;
        } else if (!merged[lower].includes(val)) {
          merged[lower] += `, ${val}`;
        }
      });
      controller.abort();
      return merged;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  let probed = await probe('HEAD');
  if (!probed || (!probed['server'] && !probed['x-powered-by'])) {
    const getProbed = await probe('GET');
    if (getProbed) probed = getProbed;
  }

  if (probed) {
    let host = '';
    try {
      host = new URL(url).hostname;
    } catch {}
    tabHeaders.set(tabId, { ...probed, __host: host });
    return probed;
  }

  return existing;
}

// Helper: ดึงข้อมูลจาก Cache ถ้ายังไม่หมดอายุ (24 ชั่วโมง)
async function getWithCache(cacheKey, fetcher, ttlMs = 86400000) {
  try {
    const stored = await chrome.storage.local.get(cacheKey);
    const entry = stored[cacheKey];
    if (entry && Date.now() - entry.timestamp < ttlMs) {
      return entry.data;
    }
  } catch {}
  const data = await fetcher();
  try {
    await chrome.storage.local.set({ [cacheKey]: { timestamp: Date.now(), data } });
  } catch {}
  return data;
}

// Plus API 1: ดึง DNS Records ผ่าน Cloudflare DoH
async function fetchDnsRecords(hostname) {
  if (!hostname || hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return { A: [], AAAA: [], CNAME: [], MX: [], TXT: [], NS: [] };
  }
  return getWithCache(`dns_${hostname}`, async () => {
    const queryType = async (type) => {
      try {
        const res = await fetch(
          `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`,
          { headers: { Accept: 'application/dns-json' } }
        );
        const json = await res.json();
        return json.Answer ? json.Answer.map((a) => a.data) : [];
      } catch {
        return [];
      }
    };

    const [A, AAAA, CNAME, MX, TXT, NS] = await Promise.all([
      queryType('A'),
      queryType('AAAA'),
      queryType('CNAME'),
      queryType('MX'),
      queryType('TXT'),
      queryType('NS')
    ]);
    return { A, AAAA, CNAME, MX, TXT, NS };
  });
}

// Plus API 2: ดึงข้อมูล IP, Hosting, ASN ผ่าน ipwho.is (ฟรี ไม่ต้องใช้ API Key)
async function fetchIpInfo(ip) {
  if (!ip) return null;
  return getWithCache(`ip_${ip}`, async () => {
    try {
      const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
      const data = await res.json();
      if (!data.success) return null;
      return {
        ip: data.ip,
        country: data.country,
        country_code: data.country_code || '',
        region: data.region,
        city: data.city,
        isp: data.connection?.isp || '',
        org: data.connection?.org || '',
        asn: data.connection?.asn || '',
        domain: data.connection?.domain || ''
      };
    } catch {
      return null;
    }
  });
}

// แปลงชื่อเทคโนโลยีเป็นชื่อแพ็กเกจใน OSV.dev เพื่อความแม่นยำในการค้นหาช่องโหว่
const OSV_PACKAGE_MAP = {
  'jquery': { name: 'jquery', ecosystem: 'npm' },
  'jquery ui': { name: 'jquery-ui', ecosystem: 'npm' },
  'jquery migrate': { name: 'jquery-migrate', ecosystem: 'npm' },
  'bootstrap': { name: 'bootstrap', ecosystem: 'npm' },
  'react': { name: 'react', ecosystem: 'npm' },
  'vue.js': { name: 'vue', ecosystem: 'npm' },
  'angular': { name: '@angular/core', ecosystem: 'npm' },
  'angularjs': { name: 'angular', ecosystem: 'npm' },
  'next.js': { name: 'next', ecosystem: 'npm' },
  'nuxt.js': { name: 'nuxt', ecosystem: 'npm' },
  'lodash': { name: 'lodash', ecosystem: 'npm' },
  'underscore.js': { name: 'underscore', ecosystem: 'npm' },
  'moment.js': { name: 'moment', ecosystem: 'npm' },
  'axios': { name: 'axios', ecosystem: 'npm' },
  'handlebars': { name: 'handlebars', ecosystem: 'npm' },
  'mustache': { name: 'mustache', ecosystem: 'npm' },
  'dompurify': { name: 'dompurify', ecosystem: 'npm' },
  'three.js': { name: 'three', ecosystem: 'npm' },
  'chart.js': { name: 'chart.js', ecosystem: 'npm' },
  'd3': { name: 'd3', ecosystem: 'npm' },
  'swiper': { name: 'swiper', ecosystem: 'npm' },
  'select2': { name: 'select2', ecosystem: 'npm' },
  'sweetalert2': { name: 'sweetalert2', ecosystem: 'npm' }
};

function extractSeverity(vuln) {
  if (vuln.database_specific?.severity) {
    return String(vuln.database_specific.severity).toUpperCase();
  }
  if (Array.isArray(vuln.severity) && vuln.severity.length > 0) {
    const scoreStr = vuln.severity[0].score || '';
    const num = parseFloat(scoreStr);
    if (!isNaN(num)) {
      if (num >= 9.0) return 'CRITICAL';
      if (num >= 7.0) return 'HIGH';
      if (num >= 4.0) return 'MEDIUM';
      return 'LOW';
    }
  }
  return 'MODERATE';
}

// Plus API 3: ตรวจสอบช่องโหว่ (CVE) ผ่าน OSV.dev
async function checkVulnerabilities(techList) {
  const results = [];
  const techWithVersions = techList.filter((t) => t.version && /^\d+\.\d+/.test(t.version));

  for (const tech of techWithVersions) {
    const cleanVersion = tech.version.match(/^\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?/)?.[0] || tech.version;
    const mapped = OSV_PACKAGE_MAP[tech.name.toLowerCase()] || {
      name: tech.name.toLowerCase(),
      ecosystem: 'npm'
    };

    const cacheKey = `cve_${mapped.ecosystem}_${mapped.name}_${cleanVersion}`;
    const vulns = await getWithCache(cacheKey, async () => {
      try {
        const res = await fetch('https://api.osv.dev/v1/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: cleanVersion,
            package: mapped
          })
        });
        const data = await res.json();
        return (data.vulns || []).slice(0, 15).map((v) => ({
          id: v.id,
          aliases: v.aliases || [],
          summary: v.summary || v.details?.slice(0, 180) || 'Vulnerability reported in OSV database',
          severity: extractSeverity(v),
          published: v.published || null
        }));
      } catch {
        return [];
      }
    });

    if (vulns.length > 0) {
      results.push({
        technology: tech.name,
        icon: tech.icon,
        version: cleanVersion,
        vulnerabilities: vulns
      });
    }
  }
  return results;
}

// ฟังก์ชันหลักในการวิเคราะห์และสร้างรายงานประจำแท็บ
async function processPageReport(tabId, msg) {
  await loadDatabase();

  const headers = await ensurePageHeaders(tabId, msg.url);

  let cookies = {};
  try {
    const cookieList = await chrome.cookies.getAll({ url: msg.url });
    cookieList.forEach((c) => {
      cookies[c.name.toLowerCase()] = c.value;
    });
  } catch {}

  const cookieJwtClaims = extractJwtClaimsFromCookies(cookies);
  const combinedJwtClaims = [...(msg.jwtClaims || []), ...cookieJwtClaims];
  const recordedTabUrls = Array.from(tabRequests.get(tabId) || []);
  const combinedXhrUrls = [...new Set([...(msg.xhrUrls || []), ...recordedTabUrls])];

  // หากพบสัญญาณของ Next.js หรือ NextAuth ให้ตรวจสอบ /api/auth/providers เพื่อหา OAuth/OIDC Provider เช่น Keycloak
  const looksLikeNextOrNextAuth =
    Boolean(msg.globals && ('__NEXT_DATA__' in msg.globals || 'next.version' in msg.globals)) ||
    /\/_next\/|\/api\/auth\//i.test(msg.html || '') ||
    Object.keys(cookies).some((k) => k.includes('next-auth') || k.includes('authjs'));

  const nextAuthProviders = looksLikeNextOrNextAuth ? await probeNextAuthProviders(msg.url) : [];

  const pagePayload = {
    url: msg.url,
    headers,
    cookies,
    metas: msg.metas,
    scripts: msg.scripts,
    inlineScripts: msg.inlineScripts || '',
    xhrUrls: combinedXhrUrls,
    storageKeys: msg.storageKeys || [],
    jwtClaims: combinedJwtClaims,
    nextAuthProviders,
    css: msg.css || '',
    text: msg.text || '',
    html: msg.html,
    globals: msg.globals,
    dom: msg.dom
  };

  let detectedTech = analyzePage(pagePayload, technologies, categories);

  // อัปเดตตัวเลข Badge บนไอคอน StackLens ทันทีที่ตรวจพบเทคโนโลยี
  try {
    await chrome.action.setBadgeText({ tabId, text: detectedTech.length ? String(detectedTech.length) : '' });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#4F46E5' });
  } catch {}

  const initialReport = {
    url: msg.url,
    hostname: msg.hostname,
    timestamp: new Date().toISOString(),
    loadingPlus: true,
    technologies: detectedTech,
    infrastructure: {
      ip: null,
      dns: { A: [], AAAA: [], CNAME: [], MX: [], TXT: [], NS: [] },
      headers
    },
    security: [],
    leads: msg.leads || { emails: [], phones: [], socials: {}, siteName: msg.hostname, description: '', schemaOrg: [] }
  };

  await chrome.storage.local.set({ [`report_${tabId}`]: initialReport });

  // ดึงข้อมูลระดับ Plus แบบขนาน
  const dns = await fetchDnsRecords(msg.hostname);
  // ประมวลผลซ้ำพร้อม DNS records เพื่อให้กฎ rule.dns (145 กฎ) ทำงานด้วย
  detectedTech = analyzePage({ ...pagePayload, dns }, technologies, categories);

  try {
    await chrome.action.setBadgeText({ tabId, text: detectedTech.length ? String(detectedTech.length) : '' });
  } catch {}

  const primaryIp = dns.A?.find((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip)) || null;
  const [ipInfo, security] = await Promise.all([
    fetchIpInfo(primaryIp),
    checkVulnerabilities(detectedTech)
  ]);

  const fullReport = {
    ...initialReport,
    loadingPlus: false,
    technologies: detectedTech,
    infrastructure: {
      ip: ipInfo,
      dns,
      headers
    },
    security
  };

  await chrome.storage.local.set({ [`report_${tabId}`]: fullReport });
  return fullReport;
}

// จัดการ Message จาก Content Script และ Popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'GET_JS_PATHS') {
    loadDatabase().then(() => {
      sendResponse({ paths: allJsPaths, domDescriptors });
    });
    return true;
  }

  if (msg.action === 'ANALYZE_PAGE' && sender.tab?.id) {
    processPageReport(sender.tab.id, msg)
      .then((report) => sendResponse({ ok: true, count: report.technologies.length }))
      .catch((err) => {
        console.error('[StackLens] Analyze error:', err);
        sendResponse({ ok: false });
      });
    return true;
  }

  if (msg.action === 'RESCAN_TAB' && msg.tabId) {
    (async () => {
      try {
        await chrome.tabs.sendMessage(msg.tabId, { action: 'TRIGGER_SCAN' });
        sendResponse({ ok: true });
      } catch {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: msg.tabId },
            files: ['src/content.js']
          });
          sendResponse({ ok: true });
        } catch (err) {
          sendResponse({ ok: false, error: err.message });
        }
      }
    })();
    return true;
  }
});
