// src/matcher.js

export function parsePattern(patternStr) {
  const parts = String(patternStr).split('\\;');
  const regexStr = parts[0];
  let version = null;
  let confidence = 100;

  for (let i = 1; i < parts.length; i++) {
    const attr = parts[i];
    if (attr.startsWith('version:')) {
      version = attr.slice(8);
    } else if (attr.startsWith('confidence:')) {
      confidence = parseInt(attr.slice(11), 10) || 100;
    }
  }

  let regex;
  try {
    regex = new RegExp(regexStr, 'i');
  } catch (e) {
    regex = new RegExp('^$');
  }

  return { regex, version, confidence };
}

export function evaluatePattern(value, patternStr) {
  if (value === undefined || value === null) {
    return { matched: false, version: null, confidence: 0 };
  }
  const strVal = String(value);
  const { regex, version: versionTemplate, confidence } = parsePattern(patternStr);
  if (patternStr === '' || String(patternStr).startsWith('\\;')) {
    return { matched: true, version: null, confidence };
  }
  const match = regex.exec(strVal);

  if (!match) return { matched: false, version: null, confidence: 0 };

  let resolvedVersion = null;
  if (versionTemplate) {
    // Support ternary syntax \1?a:b and standard \1..\9 backreferences
    resolvedVersion = versionTemplate
      .replace(/\\(\d+)\?([^:]*):(.*)$/, (_, idx, truthy, falsy) => (match[idx] ? truthy : falsy))
      .replace(/\\(\d+)/g, (_, idx) => match[idx] || '')
      .trim();
    if (!resolvedVersion) resolvedVersion = null;
  }

  return { matched: true, version: resolvedVersion, confidence };
}

export function normalizeArray(item) {
  if (item === undefined || item === null) return [];
  return Array.isArray(item) ? item : [item];
}

/**
 * Extract DOM selector descriptors from technologies database so content.js
 * knows which selectors, attributes, properties, and text to inspect.
 */
export function buildDomQueryDescriptors(technologies) {
  const selectorMap = new Map();

  const ensureEntry = (sel) => {
    if (!selectorMap.has(sel)) {
      selectorMap.set(sel, { attributes: new Set(), properties: new Set(), text: false });
    }
    return selectorMap.get(sel);
  };

  for (const rule of Object.values(technologies)) {
    if (!rule.dom) continue;

    if (typeof rule.dom === 'string' || Array.isArray(rule.dom)) {
      for (const sel of normalizeArray(rule.dom)) {
        if (typeof sel === 'string' && sel.trim()) {
          ensureEntry(sel.split('\\;')[0]);
        }
      }
    } else if (typeof rule.dom === 'object') {
      for (const [rawSel, spec] of Object.entries(rule.dom)) {
        const sel = rawSel.split('\\;')[0];
        if (!sel.trim()) continue;
        const entry = ensureEntry(sel);
        if (spec && typeof spec === 'object') {
          if (spec.text !== undefined) entry.text = true;
          if (spec.attributes && typeof spec.attributes === 'object') {
            Object.keys(spec.attributes).forEach((attr) => entry.attributes.add(attr));
          }
          if (spec.properties && typeof spec.properties === 'object') {
            Object.keys(spec.properties).forEach((prop) => entry.properties.add(prop));
          }
        }
      }
    }
  }

  const descriptors = [];
  for (const [selector, info] of selectorMap.entries()) {
    descriptors.push({
      s: selector,
      a: Array.from(info.attributes),
      p: Array.from(info.properties),
      t: info.text
    });
  }
  return descriptors;
}

/**
 * Find matching cookie values when cookieName pattern in rules may be an anchored regex
 * (e.g. "ASP\\.NET_SessionId", "\\.ASPXAUTH", "SESS[a-f0-9]{32}", "ASPSESSION")
 */
function findMatchingCookieValues(cookiesObj, cookiePatternKey) {
  const trimmed = cookiePatternKey.trim();
  const lowerKey = trimmed.toLowerCase();
  if (lowerKey in cookiesObj) {
    return [cookiesObj[lowerKey]];
  }
  try {
    const cleaned = trimmed.replace(/^\(\?i\)/i, '');
    const pattern = cleaned === 'ASPSESSION' ? '^ASPSESSION' : `^(?:${cleaned})$`;
    const rx = new RegExp(pattern, 'i');
    const matches = [];
    for (const [cName, cVal] of Object.entries(cookiesObj)) {
      if (rx.test(cName)) {
        matches.push(cVal);
      }
    }
    return matches;
  } catch {
    return [];
  }
}

/**
 * ฟังก์ชันหลักของ StackLens ในการประมวลผลข้อมูลทั้งหมดของหน้าเว็บเทียบกับ rules/technologies.json
 */
export function analyzePage(pageData, technologies, categories) {
  const detected = new Map();

  const addDetection = (techName, techRule, version, confidence) => {
    if (!techRule) return;
    const existing = detected.get(techName) || {
      name: techName,
      icon: techRule.icon || 'default.svg',
      website: techRule.website || '',
      description: techRule.description || '',
      cpe: techRule.cpe || null,
      categories: (techRule.cats || []).map((id) => categories[id]?.name || `Category ${id}`),
      categoryIds: techRule.cats || [],
      version: null,
      confidence: 0,
      implies: normalizeArray(techRule.implies),
      excludes: normalizeArray(techRule.excludes)
    };

    if (version && (!existing.version || version.length > existing.version.length)) {
      existing.version = version;
    }
    existing.confidence = Math.min(100, existing.confidence + confidence);
    detected.set(techName, existing);
  };

  for (const [techName, rule] of Object.entries(technologies)) {
    // 0. ตรวจสอบ URL
    if (rule.url && pageData.url) {
      for (const pat of normalizeArray(rule.url)) {
        const res = evaluatePattern(pageData.url, pat);
        if (res.matched) addDetection(techName, rule, res.version, res.confidence);
      }
    }

    // 1. ตรวจสอบ HTTP Headers (รองรับทั้งค่าเต็มและกรณีมีหลาย Header ชื่อซ้ำคั่นด้วยลูกน้ำ เช่น "ASP.NET, Next.js")
    if (rule.headers && pageData.headers) {
      for (const [headerName, patterns] of Object.entries(rule.headers)) {
        const headerVal = pageData.headers[headerName.toLowerCase()];
        if (headerVal !== undefined) {
          const candidates = [headerVal];
          if (headerVal.includes(',')) {
            headerVal.split(/,\s*/).forEach((part) => {
              if (part) candidates.push(part);
            });
          }
          for (const pat of normalizeArray(patterns)) {
            if (pat === '') {
              addDetection(techName, rule, null, 100);
            } else {
              for (const cand of candidates) {
                const res = evaluatePattern(cand, pat);
                if (res.matched) {
                  addDetection(techName, rule, res.version, res.confidence);
                  break;
                }
              }
            }
          }
        }
      }
    }

    // 2. ตรวจสอบ Cookies (รองรับทั้งชื่อตรงตัวและ Regex เช่น ASP\.NET_SessionId)
    if (rule.cookies && pageData.cookies) {
      for (const [cookieName, patterns] of Object.entries(rule.cookies)) {
        const cookieVals = findMatchingCookieValues(pageData.cookies, cookieName);
        for (const cookieVal of cookieVals) {
          for (const pat of normalizeArray(patterns)) {
            if (pat === '') {
              addDetection(techName, rule, null, 100);
            } else {
              const res = evaluatePattern(cookieVal, pat);
              if (res.matched) addDetection(techName, rule, res.version, res.confidence);
            }
          }
        }
      }
    }

    // 3. ตรวจสอบ Meta Tags
    if (rule.meta && pageData.metas) {
      for (const [metaName, patterns] of Object.entries(rule.meta)) {
        const metaVal = pageData.metas[metaName.toLowerCase()];
        if (metaVal !== undefined) {
          for (const pat of normalizeArray(patterns)) {
            if (pat === '') {
              addDetection(techName, rule, null, 100);
            } else {
              const res = evaluatePattern(metaVal, pat);
              if (res.matched) addDetection(techName, rule, res.version, res.confidence);
            }
          }
        }
      }
    }

    // 4. ตรวจสอบ Script Src URLs
    if (rule.scriptSrc && pageData.scripts) {
      for (const pat of normalizeArray(rule.scriptSrc)) {
        for (const src of pageData.scripts) {
          const res = evaluatePattern(src, pat);
          if (res.matched) addDetection(techName, rule, res.version, res.confidence);
        }
      }
    }

    // 4.5 ตรวจสอบ Inline Scripts & Bundled Script Content (rule.scripts — 813 กฎใน webappanalyzer)
    if (rule.scripts && pageData.inlineScripts) {
      for (const pat of normalizeArray(rule.scripts)) {
        const res = evaluatePattern(pageData.inlineScripts, pat);
        if (res.matched) addDetection(techName, rule, res.version, res.confidence);
      }
    }

    // 4.6 ตรวจสอบ XHR / Fetch / Redirect / Link Resource URLs (rule.xhr)
    if (rule.xhr && pageData.xhrUrls) {
      for (const pat of normalizeArray(rule.xhr)) {
        for (const xhrUrl of pageData.xhrUrls) {
          const res = evaluatePattern(xhrUrl, pat);
          if (res.matched) {
            addDetection(techName, rule, res.version, res.confidence);
            break;
          }
        }
      }
    }

    // 5. ตรวจสอบ HTML Content
    if (rule.html && pageData.html) {
      for (const pat of normalizeArray(rule.html)) {
        const res = evaluatePattern(pageData.html, pat);
        if (res.matched) addDetection(techName, rule, res.version, res.confidence);
      }
    }

    // 5.5 ตรวจสอบ Page Visible Text (rule.text)
    if (rule.text && pageData.text) {
      for (const pat of normalizeArray(rule.text)) {
        const res = evaluatePattern(pageData.text, pat);
        if (res.matched) addDetection(techName, rule, res.version, res.confidence);
      }
    }

    // 5.6 ตรวจสอบ CSS Rules & Custom Properties (rule.css — เช่น Tailwind CSS, shadcn/ui, Radix UI, Material UI)
    if (rule.css && pageData.css) {
      for (const pat of normalizeArray(rule.css)) {
        const res = evaluatePattern(pageData.css, pat);
        if (res.matched) addDetection(techName, rule, res.version, res.confidence);
      }
    }

    // 6. ตรวจสอบ JS Global Variables
    if (rule.js && pageData.globals) {
      for (const [jsPath, patterns] of Object.entries(rule.js)) {
        if (jsPath in pageData.globals) {
          const val = String(pageData.globals[jsPath]);
          const patList = normalizeArray(patterns);
          if (patList.length === 0 || patList[0] === '') {
            addDetection(techName, rule, null, 100);
          } else {
            for (const pat of patList) {
              const res = evaluatePattern(val, pat);
              if (res.matched) addDetection(techName, rule, res.version, res.confidence);
            }
          }
        }
      }
    }

    // 7. ตรวจสอบ DOM Selectors
    if (rule.dom && pageData.dom) {
      if (typeof rule.dom === 'string' || Array.isArray(rule.dom)) {
        for (const rawSel of normalizeArray(rule.dom)) {
          const { version, confidence } = parsePattern(rawSel);
          const sel = String(rawSel).split('\\;')[0];
          if (pageData.dom[sel]) {
            addDetection(techName, rule, version, confidence);
          }
        }
      } else if (typeof rule.dom === 'object') {
        for (const [rawSel, spec] of Object.entries(rule.dom)) {
          const sel = rawSel.split('\\;')[0];
          const matchedNodes = pageData.dom[sel];
          if (!matchedNodes || !Array.isArray(matchedNodes) || matchedNodes.length === 0) continue;

          if (!spec || typeof spec !== 'object') {
            addDetection(techName, rule, null, 100);
            continue;
          }

          for (const nodeData of matchedNodes) {
            if (spec.exists !== undefined) {
              const { confidence } = parsePattern(spec.exists);
              addDetection(techName, rule, null, confidence);
            }

            if (spec.text !== undefined && nodeData.text) {
              for (const pat of normalizeArray(spec.text)) {
                const res = evaluatePattern(nodeData.text, pat);
                if (res.matched) addDetection(techName, rule, res.version, res.confidence);
              }
            }

            if (spec.attributes && nodeData.attributes) {
              for (const [attrName, attrPatterns] of Object.entries(spec.attributes)) {
                const attrVal = nodeData.attributes[attrName];
                if (attrVal !== undefined && attrVal !== null) {
                  for (const pat of normalizeArray(attrPatterns)) {
                    if (pat === '') {
                      addDetection(techName, rule, null, 100);
                    } else {
                      const res = evaluatePattern(attrVal, pat);
                      if (res.matched) addDetection(techName, rule, res.version, res.confidence);
                    }
                  }
                }
              }
            }

            if (spec.properties && nodeData.properties) {
              for (const [propName, propPatterns] of Object.entries(spec.properties)) {
                if (propName in nodeData.properties) {
                  const propVal = nodeData.properties[propName];
                  for (const pat of normalizeArray(propPatterns)) {
                    if (pat === '') {
                      addDetection(techName, rule, null, 100);
                    } else {
                      const res = evaluatePattern(propVal, pat);
                      if (res.matched) addDetection(techName, rule, res.version, res.confidence);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // 7.5 ตรวจสอบ DNS Records (rule.dns)
    if (rule.dns && pageData.dns) {
      for (const [dnsType, patterns] of Object.entries(rule.dns)) {
        const records = pageData.dns[dnsType.toUpperCase()] || [];
        for (const rec of records) {
          for (const pat of normalizeArray(patterns)) {
            const res = evaluatePattern(rec, pat);
            if (res.matched) addDetection(techName, rule, res.version, res.confidence);
          }
        }
      }
    }
  }

  // 8. เสริมความแม่นยำในการตรวจจับ Web Server & Server OS (Deep Server Heuristics)
  const headers = pageData.headers || {};
  const cookies = pageData.cookies || {};
  const serverHeader = [
    headers['server'],
    headers['x-server'],
    headers['x-backend-server'],
    headers['x-origin-server'],
    headers['via']
  ]
    .filter(Boolean)
    .join(' ');
  const poweredBy = headers['x-powered-by'] || '';

  // 8.1 ตรวจจับ IIS แม้ถูกคั่นด้วย Proxy หรือซ่อนไว้ใน Header อื่น
  const iisMatch = /(?:Microsoft-)?IIS(?:\s*\/\s*([\d.]+))?/i.exec(serverHeader + ' ' + poweredBy);
  if (iisMatch && technologies['IIS']) {
    addDetection('IIS', technologies['IIS'], iisMatch[1] || null, 100);
  }

  // 8.2 Microsoft-HTTPAPI (HTTP.sys kernel driver บน Windows Server)
  if (/Microsoft-HTTPAPI/i.test(serverHeader) || detected.has('Microsoft HTTPAPI')) {
    if (technologies['Windows Server']) {
      addDetection('Windows Server', technologies['Windows Server'], null, 100);
    }
  }

  // 8.3 Header เฉพาะของ IIS / Exchange / Windows Server
  const hasWindowsSpecificHeader =
    Boolean(headers['x-aspnet-version']) ||
    Boolean(headers['x-aspnetmvc-version']) ||
    Boolean(headers['x-feserver']) ||
    Boolean(headers['x-beserver']) ||
    Boolean(headers['x-calculatedbetarget']) ||
    Boolean(headers['x-diaginfo']) ||
    /\bASP\.NET\b/i.test(poweredBy) ||
    /\bARR\b/i.test(poweredBy);

  const hasClassicAspCookieOrDom =
    findMatchingCookieValues(cookies, '^(?:ASPSESSION|ASP\\.NET_SessionId|\\.ASPXAUTH)').length > 0 ||
    Boolean(pageData.dom?.["input[name*='__VIEWSTATE']"]) ||
    /<input[^>]+name=["']__VIEWSTATE/i.test(pageData.html || '') ||
    /\.aspx?(?:$|\?)/i.test(pageData.url || '');

  if ((hasWindowsSpecificHeader || hasClassicAspCookieOrDom || detected.has('Microsoft ASP.NET')) && !detected.has('Kestrel')) {
    if (technologies['IIS'] && !detected.has('IIS')) {
      addDetection('IIS', technologies['IIS'], null, hasWindowsSpecificHeader || hasClassicAspCookieOrDom ? 100 : 85);
    }
    if (technologies['Windows Server'] && !detected.has('Windows Server')) {
      addDetection('Windows Server', technologies['Windows Server'], null, hasWindowsSpecificHeader || hasClassicAspCookieOrDom ? 100 : 85);
    }
  }

  // 8.4 ตรวจจับ Windows Server จาก Server Header เพิ่มเติม
  if (/\b(?:Win32|Win64|Windows(?:\s+NT|\s+Server)?)\b/i.test(serverHeader) && technologies['Windows Server']) {
    addDetection('Windows Server', technologies['Windows Server'], null, 100);
  }

  // 8.5 Deep Authentication & SSO Heuristics (JWT Claims, Storage Keys, Cookie Values, NextAuth Providers)
  const jwtClaims = pageData.jwtClaims || [];
  for (const claim of jwtClaims) {
    const iss = (claim.iss || '').toLowerCase();
    const keys = claim.keys || [];

    // Keycloak มีโครงสร้าง JWT เฉพาะตัวคือ realm_access / resource_access หรือ iss ที่มี /realms/
    if (
      iss.includes('/realms/') ||
      iss.includes('keycloak') ||
      keys.includes('realm_access') ||
      keys.includes('resource_access')
    ) {
      if (technologies['Keycloak']) addDetection('Keycloak', technologies['Keycloak'], null, 100);
      if (technologies['OpenID Connect']) addDetection('OpenID Connect', technologies['OpenID Connect'], null, 100);
    }
    if (iss.includes('login.microsoftonline.com') || iss.includes('sts.windows.net')) {
      if (technologies['Microsoft Entra ID']) addDetection('Microsoft Entra ID', technologies['Microsoft Entra ID'], null, 100);
    }
    if (iss.includes('accounts.google.com')) {
      if (technologies['Google Sign-in']) addDetection('Google Sign-in', technologies['Google Sign-in'], null, 100);
    }
    if (iss.includes('auth0.com')) {
      if (technologies['Auth0']) addDetection('Auth0', technologies['Auth0'], null, 100);
    }
    if (iss.includes('okta.com')) {
      if (technologies['Okta']) addDetection('Okta', technologies['Okta'], null, 100);
    }
    if (iss.includes('cognito-idp')) {
      if (technologies['Amazon Cognito']) addDetection('Amazon Cognito', technologies['Amazon Cognito'], null, 100);
    }
    if (iss.includes('securetoken.google.com')) {
      if (technologies['Firebase Authentication']) addDetection('Firebase Authentication', technologies['Firebase Authentication'], null, 100);
    }
    if (iss.includes('/auth/v1') || iss.includes('supabase')) {
      if (technologies['Supabase Auth']) addDetection('Supabase Auth', technologies['Supabase Auth'], null, 100);
    }
    if (iss.includes('access.line.me')) {
      if (technologies['LINE Login']) addDetection('LINE Login', technologies['LINE Login'], null, 100);
    }
    if (iss.includes('imauth.bora.dopa.go.th')) {
      if (technologies['ThaID (DOPA Digital ID)']) addDetection('ThaID (DOPA Digital ID)', technologies['ThaID (DOPA Digital ID)'], null, 100);
    }
  }

  // ตรวจสอบ Storage Keys สำหรับ OIDC / Keycloak / MSAL / Supabase / Firebase / Clerk / Auth0
  for (const sKey of pageData.storageKeys || []) {
    if (/^(?:kc-callback-|keycloak)/i.test(sKey) && technologies['Keycloak']) {
      addDetection('Keycloak', technologies['Keycloak'], null, 100);
    }
    if (/^oidc\.user:/i.test(sKey) && technologies['OpenID Connect']) {
      addDetection('OpenID Connect', technologies['OpenID Connect'], null, 100);
      if (/\/realms\/|keycloak/i.test(sKey) && technologies['Keycloak']) {
        addDetection('Keycloak', technologies['Keycloak'], null, 100);
      }
    }
    if (/^msal\./i.test(sKey) && technologies['Microsoft Authentication']) {
      addDetection('Microsoft Authentication', technologies['Microsoft Authentication'], null, 100);
    }
    if (/^supabase\.auth\.token|^sb-.*-auth-token/i.test(sKey) && technologies['Supabase Auth']) {
      addDetection('Supabase Auth', technologies['Supabase Auth'], null, 100);
    }
    if (/^firebase:authUser/i.test(sKey) && technologies['Firebase Authentication']) {
      addDetection('Firebase Authentication', technologies['Firebase Authentication'], null, 100);
    }
    if (/^@@auth0spajs@@/i.test(sKey) && technologies['Auth0']) {
      addDetection('Auth0', technologies['Auth0'], null, 100);
    }
  }

  // ตรวจสอบค่าใน Cookies (เช่น callback-url หรือ session cookie ที่มี URL ของ Keycloak / OIDC)
  const allCookieValuesStr = Object.values(cookies).join(' ');
  if (/(?:\/realms\/[^/\s"']+\/protocol\/openid-connect|\/api\/auth\/(?:callback|signin)\/keycloak|keycloak)/i.test(allCookieValuesStr)) {
    if (technologies['Keycloak']) addDetection('Keycloak', technologies['Keycloak'], null, 100);
  }

  // ตรวจสอบรายการ Providers ที่ได้จาก /api/auth/providers (กรณีเว็บใช้ NextAuth.js / Auth.js)
  if (Array.isArray(pageData.nextAuthProviders) && pageData.nextAuthProviders.length > 0) {
    if (technologies['NextAuth.js']) {
      addDetection('NextAuth.js', technologies['NextAuth.js'], null, 100);
    }
    for (const p of pageData.nextAuthProviders) {
      const pid = String(p.id || '').toLowerCase();
      const pname = String(p.name || '').toLowerCase();
      const purl = String(p.signinUrl || p.callbackUrl || '').toLowerCase();
      if (pid.includes('keycloak') || pname.includes('keycloak') || purl.includes('keycloak') || purl.includes('/realms/')) {
        if (technologies['Keycloak']) addDetection('Keycloak', technologies['Keycloak'], null, 100);
      }
      if (pid.includes('google') || pname.includes('google')) {
        if (technologies['Google Sign-in']) addDetection('Google Sign-in', technologies['Google Sign-in'], null, 100);
      }
      if (pid.includes('azure-ad') || pid.includes('entra') || pname.includes('microsoft') || pname.includes('azure')) {
        if (technologies['Microsoft Entra ID']) addDetection('Microsoft Entra ID', technologies['Microsoft Entra ID'], null, 100);
      }
      if (pid.includes('line') || pname === 'line') {
        if (technologies['LINE Login']) addDetection('LINE Login', technologies['LINE Login'], null, 100);
      }
      if (pid.includes('apple') || pname.includes('apple')) {
        if (technologies['Apple Sign-in']) addDetection('Apple Sign-in', technologies['Apple Sign-in'], null, 100);
      }
      if (pid.includes('auth0') || pname.includes('auth0')) {
        if (technologies['Auth0']) addDetection('Auth0', technologies['Auth0'], null, 100);
      }
      if (pid.includes('okta') || pname.includes('okta')) {
        if (technologies['Okta']) addDetection('Okta', technologies['Okta'], null, 100);
      }
      if (pid.includes('cognito') || pname.includes('cognito')) {
        if (technologies['Amazon Cognito']) addDetection('Amazon Cognito', technologies['Amazon Cognito'], null, 100);
      }
      if (pid.includes('thaid') || pname.includes('thaid')) {
        if (technologies['ThaID (DOPA Digital ID)']) addDetection('ThaID (DOPA Digital ID)', technologies['ThaID (DOPA Digital ID)'], null, 100);
      }
    }
  }

  // 9. ประมวลผล Implies แบบ Multi-pass
  let addedImplied = true;
  let pass = 0;
  while (addedImplied && pass < 4) {
    addedImplied = false;
    pass++;
    for (const item of Array.from(detected.values())) {
      for (const impliedRaw of item.implies) {
        const { confidence } = parsePattern(impliedRaw);
        const impliedName = String(impliedRaw).split('\\;')[0];
        if (!detected.has(impliedName) && technologies[impliedName]) {
          addDetection(impliedName, technologies[impliedName], null, confidence);
          addedImplied = true;
        }
      }
    }
  }

  // 10. ประมวลผล Excludes
  const toExclude = new Set();
  for (const item of detected.values()) {
    for (const exRaw of item.excludes || []) {
      const exName = String(exRaw).split('\\;')[0];
      toExclude.add(exName);
    }
  }
  for (const exName of toExclude) {
    detected.delete(exName);
  }

  return Array.from(detected.values()).sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));
}
