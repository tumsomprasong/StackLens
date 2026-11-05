// src/content.js
(function () {
  if (window.__STACKLENS_CONTENT_LOADED__) return;
  window.__STACKLENS_CONTENT_LOADED__ = true;

  // 1. ฉีด inject.js เข้าสู่หน้าเว็บ
  let injectReady = false;
  function ensureInjected() {
    if (injectReady) return Promise.resolve();
    return new Promise((resolve) => {
      try {
        const scriptEl = document.createElement('script');
        scriptEl.src = chrome.runtime.getURL('src/inject.js');
        scriptEl.onload = () => {
          injectReady = true;
          scriptEl.remove();
          resolve();
        };
        scriptEl.onerror = () => resolve();
        (document.head || document.documentElement).appendChild(scriptEl);
      } catch {
        resolve();
      }
    });
  }

  // 2. ตรวจสอบ DOM Selectors ตามกฎของ webappanalyzer
  function evaluateDomDescriptors(domDescriptors = []) {
    const domMatches = {};

    for (const desc of domDescriptors) {
      const selector = desc.s;
      if (!selector) continue;
      try {
        const elements = document.querySelectorAll(selector);
        if (!elements || elements.length === 0) continue;

        const nodeResults = [];
        const limit = Math.min(elements.length, 5);
        for (let i = 0; i < limit; i++) {
          const el = elements[i];
          const nodeInfo = {};

          if (desc.t) {
            nodeInfo.text = (el.textContent || '').trim().slice(0, 500);
          }

          if (desc.a && desc.a.length > 0) {
            nodeInfo.attributes = {};
            for (const attr of desc.a) {
              const val = el.getAttribute(attr);
              if (val !== null) {
                nodeInfo.attributes[attr] = val.slice(0, 500);
              }
            }
          }

          if (desc.p && desc.p.length > 0) {
            nodeInfo.properties = {};
            for (const prop of desc.p) {
              if (prop in el) {
                const val = el[prop];
                nodeInfo.properties[prop] =
                  typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean'
                    ? String(val).slice(0, 500)
                    : 'true';
              }
            }
          }

          nodeResults.push(nodeInfo);
        }

        domMatches[selector] = nodeResults;
      } catch {
        // ข้ามกรณี CSS Selector บางตัวไม่รองรับใน querySelectorAll
      }
    }

    return domMatches;
  }

  // ถอดรหัสเฉพาะส่วน Payload ของ JWT แบบปลอดภัยเพื่อดึงชื่อ Issuer (iss) และโครงสร้าง Claims (เช่น realm_access ของ Keycloak)
  function extractJwtMetadataFromString(str, jwtClaimsList) {
    if (!str || typeof str !== 'string') return;
    const jwtRegex = /eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g;
    let m;
    while ((m = jwtRegex.exec(str)) !== null) {
      try {
        const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonStr = atob(b64);
        const payload = JSON.parse(jsonStr);
        if (payload && typeof payload === 'object') {
          jwtClaimsList.push({
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

  // สกัดสัญญาณจาก localStorage / sessionStorage (ชื่อ Key และ JWT Metadata)
  function extractStorageAuthSignals() {
    const storageKeys = [];
    const jwtClaims = [];
    const storageSnippets = [];

    const inspectStore = (store) => {
      if (!store) return;
      try {
        const len = Math.min(store.length, 60);
        for (let i = 0; i < len; i++) {
          const key = store.key(i);
          if (!key) continue;
          storageKeys.push(key);
          const val = store.getItem(key) || '';
          extractJwtMetadataFromString(val, jwtClaims);
          // เก็บเฉพาะ URL / ชื่อ Provider ที่เกี่ยวกับ Auth/OIDC
          if (
            /(?:keycloak|\/realms\/|openid-connect|next-auth|authjs|msal|microsoftonline|cognito|auth0|okta|supabase|firebase|supertokens|authentik|authelia|thaid)/i.test(
              key + ' ' + val.slice(0, 1500)
            )
          ) {
            storageSnippets.push(`${key}:${val.slice(0, 600)}`);
          }
        }
      } catch {}
    };

    inspectStore(window.localStorage);
    inspectStore(window.sessionStorage);
    extractJwtMetadataFromString(document.cookie || '', jwtClaims);

    return { storageKeys, jwtClaims, storageSnippets: storageSnippets.join('\n') };
  }

  // สกัด CSS Rules และ CSS Variables จาก document.styleSheets และ <style> เพื่อตรวจจับ Tailwind CSS, shadcn/ui, Radix UI, MUI ฯลฯ
  function extractPageCss() {
    const cssChunks = [];
    let totalLen = 0;
    const MAX_CSS_LEN = 100000;

    // 1. Inline <style>
    document.querySelectorAll('style').forEach((s) => {
      if (totalLen < MAX_CSS_LEN && s.textContent) {
        const chunk = s.textContent.slice(0, 25000);
        cssChunks.push(chunk);
        totalLen += chunk.length;
      }
    });

    // 2. Accessible CSSStyleSheets (เช่น /_next/static/css/*.css หรือ /assets/*.css)
    try {
      for (const sheet of Array.from(document.styleSheets)) {
        if (totalLen >= MAX_CSS_LEN) break;
        try {
          const rules = sheet.cssRules;
          if (!rules) continue;
          const limit = Math.min(rules.length, 400);
          for (let i = 0; i < limit; i++) {
            const text = rules[i].cssText;
            if (text) {
              cssChunks.push(text);
              totalLen += text.length;
              if (totalLen >= MAX_CSS_LEN) break;
            }
          }
        } catch {
          // ข้าม Cross-origin stylesheets ที่ติด CORS
        }
      }
    } catch {}

    return cssChunks.join('\n');
  }

  // สแกนไฟล์ JS Bundle บนโดเมนเดียวกันจาก Browser Cache เพื่อหาการตั้งค่า Authentication & 2026 Stack
  async function scanSameOriginBundlesForAuth(scriptUrls) {
    const origin = window.location.origin;
    const sameOriginScripts = scriptUrls
      .filter((u) => u.startsWith(origin) && /\.js(?:\?|$)/i.test(u))
      .slice(-14); // เน้นไฟล์ page/app chunks ล่าสุด

    const matchedSnippets = [];
    const bundleRegex =
      /(?:\/realms\/[A-Za-z0-9_-]+\/protocol\/openid-connect|\/auth\/realms\/|keycloak(?:-js|\.js|\.min\.js)?|signIn\(["'](?:keycloak|google|azure-ad|okta|auth0|line|cognito)["']\)|\/api\/auth\/(?:session|providers|signin|callback)(?:\/[a-z0-9-]+)?|KC_RESTART|KEYCLOAK_IDENTITY|login\.microsoftonline\.com|imauth\.bora\.dopa\.go\.th|cognito-idp\.[a-z0-9-]+\.amazonaws\.com|identitytoolkit\.googleapis\.com|@tanstack\/react-query|@tanstack\/react-router|@trpc\/client|\/api\/trpc|zustand\/middleware|@ai-sdk\/react|generativelanguage\.googleapis\.com)/gi;

    await Promise.all(
      sameOriginScripts.map(async (url) => {
        try {
          const res = await fetch(url, { cache: 'force-cache' });
          if (!res.ok) return;
          const text = await res.text();
          const matches = text.match(bundleRegex);
          if (matches && matches.length > 0) {
            matchedSnippets.push(...new Set(matches));
          }
        } catch {}
      })
    );

    return matchedSnippets.join('\n');
  }

  // 3. กวาดข้อมูล Meta, Scripts, Inline Scripts, XHRs, Storage, DOM และ Lead Info
  async function extractPageAndLeadData(domDescriptors = []) {
    const scripts = Array.from(document.scripts)
      .map((s) => s.src)
      .filter(Boolean);

    // รวบรวมเนื้อหา Inline <script> (เช่น __NEXT_DATA__, self.__next_f, config blocks)
    const inlineChunks = [];
    let inlineLen = 0;
    for (const s of Array.from(document.scripts)) {
      if (!s.src && s.textContent && inlineLen < 150000) {
        const chunk = s.textContent.slice(0, 35000);
        inlineChunks.push(chunk);
        inlineLen += chunk.length;
      }
    }

    // สแกน JS Chunks จาก Cache สำหรับ SPA / Next.js
    const bundleAuthSignals = await scanSameOriginBundlesForAuth(scripts);
    const { storageKeys, jwtClaims, storageSnippets } = extractStorageAuthSignals();

    // รวบรวม URLs จาก Performance Resource Timing (XHR, Fetch, Iframe, Script) + ลิงก์และฟอร์มบนหน้าเว็บ
    const resourceUrls = [];
    try {
      performance.getEntriesByType('resource').forEach((r) => {
        if (r.name) resourceUrls.push(r.name);
      });
    } catch {}

    document.querySelectorAll('a[href], form[action], iframe[src]').forEach((el) => {
      const u = el.getAttribute('href') || el.getAttribute('action') || el.getAttribute('src');
      if (u) resourceUrls.push(u);
    });

    const metas = {};
    document.querySelectorAll('meta').forEach((m) => {
      const key = m.getAttribute('name') || m.getAttribute('property') || m.getAttribute('http-equiv');
      if (key && m.content) metas[key.toLowerCase()] = m.content;
    });

    // ดึงอีเมลจาก Text และ mailto:
    const bodyText = document.body ? document.body.innerText : '';
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const rawEmails = bodyText.match(emailRegex) || [];
    const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map((a) =>
      decodeURIComponent(a.href.replace(/^mailto:/i, '').split('?')[0].trim())
    );

    const emails = [...new Set([...mailtoLinks, ...rawEmails])].filter(
      (e) =>
        e &&
        e.length <= 80 &&
        !e.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|js|css|woff|woff2|ttf|eot|mp4|mp3)$/i) &&
        !e.includes('example.com') &&
        !e.includes('sentry.io')
    );

    // ดึงเบอร์โทรศัพท์จากลิงก์ tel:
    const telLinks = Array.from(document.querySelectorAll('a[href^="tel:"]'))
      .map((a) => decodeURIComponent(a.href.replace(/^tel:/i, '').split('?')[0].trim()))
      .filter(Boolean);
    const phones = [...new Set(telLinks)].slice(0, 15);

    // ดึงลิงก์ Social Media
    const socialPatterns = {
      linkedin: /linkedin\.com\/(company|in|school)\/([^/?#]+)/i,
      twitter: /(twitter\.com|x\.com)\/(?!intent|share|home)([^/?#]+)/i,
      facebook: /facebook\.com\/(?!sharer|dialog|plugins)([^/?#]+)/i,
      instagram: /instagram\.com\/(?!p\/|reel\/)([^/?#]+)/i,
      github: /github\.com\/(?!orgs|topics|features|marketplace)([^/?#]+)/i,
      youtube: /youtube\.com\/(@|channel\/|c\/|user\/)([^/?#]+)/i
    };

    const socials = {};
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.href;
      for (const [platform, regex] of Object.entries(socialPatterns)) {
        if (!socials[platform] && regex.test(href)) {
          socials[platform] = href;
        }
      }
    });

    // ดึงข้อมูลบริษัทจาก JSON-LD (Schema.org)
    const schemaOrg = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
      try {
        const json = JSON.parse(s.textContent);
        schemaOrg.push(json);
      } catch (e) {}
    });

    const dom = evaluateDomDescriptors(domDescriptors);
    const css = extractPageCss();

    return {
      scripts,
      inlineScripts: [inlineChunks.join('\n'), bundleAuthSignals, storageSnippets].filter(Boolean).join('\n'),
      xhrUrls: [...new Set(resourceUrls)].slice(0, 300),
      storageKeys,
      jwtClaims,
      metas,
      dom,
      css,
      text: bodyText.slice(0, 30000),
      html: document.documentElement ? document.documentElement.outerHTML.slice(0, 120000) : '',
      leads: {
        emails: emails.slice(0, 20),
        phones,
        socials,
        siteName: metas['og:site_name'] || metas['application-name'] || document.title || window.location.hostname,
        description: metas['description'] || metas['og:description'] || metas['twitter:description'] || '',
        schemaOrg
      }
    };
  }

  // 4. ฟังก์ชันรันการสแกนทั้งหมดและส่งผลลัพธ์ไปยัง Background
  async function runScan() {
    await ensureInjected();

    chrome.runtime.sendMessage({ action: 'GET_JS_PATHS' }, (response) => {
      if (chrome.runtime.lastError) return;
      const paths = response?.paths || [];
      const domDescriptors = response?.domDescriptors || [];

      let completed = false;
      const finishScan = async (globals) => {
        if (completed) return;
        completed = true;
        window.removeEventListener('message', listener);

        const pageInfo = await extractPageAndLeadData(domDescriptors);
        chrome.runtime.sendMessage({
          action: 'ANALYZE_PAGE',
          url: window.location.href,
          hostname: window.location.hostname,
          globals: globals || {},
          ...pageInfo
        });
      };

      const listener = (event) => {
        if (event.source !== window || event.data?.type !== 'STACKLENS_GLOBALS_RESULT') return;
        finishScan(event.data.globals);
      };

      window.addEventListener('message', listener);
      setTimeout(() => {
        window.postMessage({ type: 'STACKLENS_CHECK_JS', paths }, '*');
      }, 120);

      // Fallback กรณี CSP บล็อก inline/external script ในบางหน้า
      setTimeout(() => {
        finishScan({});
      }, 1200);
    });
  }

  // รันสแกนอัตโนมัติเมื่อโหลดหน้าเสร็จ
  runScan();

  // รองรับคำสั่ง TRIGGER_SCAN จาก Popup
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'TRIGGER_SCAN') {
      runScan();
      sendResponse({ ok: true });
    }
  });
})();
