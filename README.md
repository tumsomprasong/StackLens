<div align="center">
  <img src="assets/logo.svg" alt="StackLens Logo" width="96" height="96" />
  <h1>StackLens</h1>
  <p><strong>Deep Web Stack, Infrastructure, Security &amp; Lead Lens — 100% Free &amp; Open Source.</strong></p>
  <p>
    <img src="https://img.shields.io/badge/License-GPL--3.0--only-4F46E5?style=flat-square" alt="License: GPL-3.0-only" />
    <img src="https://img.shields.io/badge/Chrome-Manifest_V3-06B6D4?style=flat-square" alt="Chrome Manifest V3" />
    <img src="https://img.shields.io/badge/Signatures-7%2C760%2B_(2026_Edition)-10B981?style=flat-square" alt="7,760+ Signatures" />
    <img src="https://img.shields.io/badge/Architecture-100%25_Serverless-6366F1?style=flat-square" alt="100% Serverless" />
  </p>
  <p>
    <strong>English</strong> · <a href="README.th.md">ภาษาไทย (Thai)</a>
  </p>
</div>

---

**StackLens** is an open-source Chromium browser extension (Manifest V3) for deep web technology fingerprinting, DNS/IP infrastructure reconnaissance, automated CVE vulnerability auditing, and company lead extraction — unlocking **Plus-grade** intelligence 100% free and **Serverless** directly in your browser.

---

## ✨ Key Features (2026 Edition)

### 1. 🔍 Deep Technology Fingerprinting (`7,760+` Technologies / `109` Categories)
Powered by a unified database merging `enthec/webappanalyzer`, `projectdiscovery/wappalyzergo`, and a curated **2026 Modern Web Stack** ruleset:
- **Multi-Layer Inspection Engine**: Evaluates URLs, HTTP Response Headers (with active `HEAD`/`GET` live probing), Cookies (including `HttpOnly` and regex keys), Meta tags, External & Inline `<script>` tags, **Cached Same-Origin JS Bundles**, **Stylesheets & CSS Custom Properties (`rule.css`)**, **DOM Selectors (`1,800+` patterns)**, **Main-World JS Globals**, and **DNS Records (`rule.dns`)**.
- **2026 Frontend, Meta-Frameworks & UI Systems**:
  - Detects **React 18 / 19** (via Fiber root `__reactContainer$` / `__reactFiber$`), **Next.js 15 / 16 App Router** (`self.__next_f` RSC payload even when `X-Powered-By` is stripped), **Turbopack**, **Vite**, **Vue 3 / Nuxt 3–4**, **Svelte 5 / SvelteKit**, **Astro**, **Remix**, **Qwik**, and **HTMX**.
  - Detects **Tailwind CSS (v3 & v4)**, **shadcn/ui**, **Radix UI**, **DaisyUI**, **HeroUI (NextUI)**, **Ant Design**, **Material UI**, **Chakra UI**, **Mantine**, and icon systems including **Lucide**, **Tabler Icons**, and **Phosphor Icons**.
  - Detects modern data/state libraries including **TanStack Query / Router / Start**, **tRPC**, **Zustand**, and **GraphQL / Apollo**.
- **Deep Authentication & SSO Heuristics (`Category 69`)**:
  - Detects **Keycloak**, **NextAuth.js (Auth.js v4/v5)**, **Better Auth**, **Clerk**, **Kinde**, **WorkOS (AuthKit)**, **Stytch**, **Descope**, **Logto**, **OpenID Connect (OIDC)**, **OAuth 2.0**, **SAML 2.0**, **Microsoft Entra ID (Azure AD)**, **ADFS**, **Authentik**, **Authelia**, **Shibboleth**, **WSO2 Identity Server**, **Ping Identity**, **ForgeRock**, **FusionAuth**, **Zitadel**, **Ory**, **SuperTokens**, **Supabase Auth**, **Firebase Authentication**, **Apereo CAS**, and **ThaID (DOPA Digital ID)**.
  - **Local JWT Claim Inspector & NextAuth Provider Discovery**: Safely inspects public JWT payload metadata (`iss`, `realm_access`, `resource_access`) in cookies and web storage without exposing raw tokens, and automatically probes `/api/auth/providers` on NextAuth sites to identify backing OAuth/OIDC providers.
- **Deep Web Server & OS Inference**:
  - Accurately identifies **IIS** and **Windows Server** even behind reverse proxies/CDNs or when the `Server` header is stripped, correlating ASP.NET, ARR, `Microsoft-HTTPAPI`, Windows-specific headers, cookies, and same-origin sub-requests.
- **AI, Cloud, Serverless Databases & Regional Payment Gateways**:
  - **AI / LLM**: **Vercel AI SDK**, **Google Gemini**, **OpenAI**, **Anthropic**, **Dify**, **Flowise**, **Voiceflow**, **Chainlit**, **Gradio**.
  - **Cloud & BaaS**: **Cloudflare Pages / Workers**, **Vercel**, **Netlify**, **Supabase**, **Firebase**, **Convex**, **PocketBase**, **Upstash**, **Neon**, **Turso**.
  - **Payments**: **Stripe**, **Polar**, **Omise (Opn Payments)**, **2C2P**, **GBPrimePay**, **ChillPay**, **Beam Checkout**.

---

### 2. 🌐 Infrastructure & DNS Intelligence (Plus Feature)
- **Cloudflare DNS over HTTPS (DoH `1.1.1.1`)**: Resolves `A`, `AAAA`, `CNAME`, `MX`, `NS`, and `TXT` records directly over encrypted HTTPS.
- **IP, ASN & Hosting Geolocation (`ipwho.is`)**: Displays IPv4 address, ISP/Hosting provider, Organization, ASN (`ASxxxx`), and geographic location (City, Region, Country) with one-click IP copy.
- **Live HTTP Response Headers**: Captures and displays full HTTP response headers from the active tab.

---

### 3. 🛡️ Automated Security & CVE Vulnerability Scanner (Plus Feature)
- Automatically audits versioned libraries and packages detected on the page against the **[OSV.dev](https://osv.dev/) Vulnerability API**.
- Surfaces CVE / GHSA identifiers, severity badges (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), vulnerability summaries, and direct advisory links.

---

### 4. 📇 Lead & Metadata Extractor (Plus Feature)
- Extracts contact **email addresses** (`mailto:` links and page text) and **phone numbers** (`tel:` links) with individual **Copy** and **Copy All Emails** actions.
- Detects official **Social Media profiles** (`LinkedIn`, `X/Twitter`, `Facebook`, `Instagram`, `GitHub`, `YouTube`).
- Inspects **OpenGraph metadata** and renders formatted **Schema.org (`application/ld+json`)** structured data with a **Copy JSON** button.

---

### 5. 🎨 High-Density 2-Column UI, Dark/Light Theme & One-Click Export
- **Balanced 2-Column Masonry Layout**: Distributes technology categories across two height-balanced columns to eliminate wasted horizontal and vertical whitespace.
- **Dark / Light Mode Toggle (☀️ / 🌙)**: Switch seamlessly between the signature **Deep Indigo & Electric Cyan** dark workbench and a high-contrast **WCAG AA** light theme with persistent preference storage.
- **Keyboard Shortcuts**:
  - Press `/` to focus the technology/category filter bar immediately.
  - Press `Esc` to clear the active filter.
  - Press `ArrowLeft` / `ArrowRight` to navigate between tabs.
- **JSON / CSV Export & 24-Hour Smart Cache**: Export full site reports to `.json` or `.csv` in one click. DNS, IP, and CVE lookups are cached in `chrome.storage.local` for 24 hours per domain.

---

## 📁 Project Structure

```text
stacklens/
├── LICENSE                     # GNU GPL v3.0 License (GPL-3.0-only)
├── README.md                   # Primary English documentation
├── README.th.md                # Thai documentation (คู่มือภาษาไทย)
├── manifest.json               # Chrome Extension Manifest V3
├── package.json                # Project metadata & CLI scripts
├── assets/
│   ├── logo.svg                # StackLens vector brand mark
│   ├── icon-16.png             # 16x16 extension icon
│   ├── icon-48.png             # 48x48 extension icon
│   └── icon-128.png            # 128x128 extension icon
├── scripts/
│   ├── fetch-rules.mjs         # Fetches & merges 7,760+ 2026 technology fingerprints
│   └── generate-icons.mjs      # Pure Node.js 4x supersampled PNG icon generator
├── rules/
│   ├── categories.json         # Technology categories (109 categories)
│   └── technologies.json       # Unified fingerprint database (7,760+ technologies)
├── src/
│   ├── background.js           # Service Worker: Headers, Active Probe, DoH DNS, IP, OSV CVE, Cache
│   ├── content.js              # Content Script: DOM, Stylesheets (CSS), Cached JS Chunks, JWT & Leads
│   ├── inject.js               # Main World Script: Global variables & React 18/19 Fiber / Vue 3 roots
│   └── matcher.js              # Rule Engine: Pattern evaluation + Deep Server & Auth/SSO heuristics
└── popup/
    ├── popup.html              # 4-Tab workbench popup markup
    ├── popup.css               # 2-Column Masonry UI styles (Dark & Light themes)
    └── popup.js                # Real-time rendering, search filter, theme toggle & JSON/CSV export
```

---

## 🚀 Installation (Load Unpacked)

StackLens works on all Chromium-based browsers (**Google Chrome**, **Microsoft Edge**, **Brave**, **Arc**, **Vivaldi**):

1. **Clone or download this repository**:
   ```bash
   git clone https://github.com/your-username/stacklens.git
   cd stacklens
   ```
2. **Open the Browser Extensions page**:
   - Navigate to `chrome://extensions/` in Chrome (or `edge://extensions/` in Edge).
3. **Enable Developer Mode**:
   - Toggle **Developer mode** on in the top-right corner.
4. **Load Unpacked**:
   - Click **Load unpacked** (top-left button) and select the `StackLens` project folder.
5. **Pin & Inspect**:
   - Click the Extensions puzzle icon (🧩) in the browser toolbar and **Pin** **StackLens**.
   - Open any `http://` or `https://` website and click the **StackLens** icon to inspect its stack.

---

## 🛠️ Developer Scripts

Pre-built `rules/categories.json`, `rules/technologies.json`, and PNG icons are already included in the repository. To refresh the fingerprint database or regenerate icons (requires Node.js v18+):

```bash
# Fetch and merge the latest upstream + 2026 technology rules
npm run update-rules

# Regenerate 16x16, 48x48, and 128x128 PNG icons from logo geometry
npm run generate-icons
```

---

## 🔒 Privacy & Security

- **Zero Telemetry / No Tracking**: StackLens runs 100% locally in your browser. Browsing history and scan results are never transmitted to any central server.
- **Safe JWT Metadata Inspection**: When identifying SSO providers (such as Keycloak, Entra ID, or Auth0), StackLens inspects only structural claim keys and the public `iss` (Issuer) URL locally—never storing or exporting raw tokens.
- **Direct Public APIs**:
  - DNS resolution via `https://cloudflare-dns.com/dns-query`
  - IP & ASN lookup via `https://ipwho.is/`
  - Vulnerability lookup via `https://api.osv.dev/v1/query`

---

## 📜 License

Distributed under the **GNU General Public License v3.0 only (`GPL-3.0-only`)**. See [LICENSE](LICENSE) for full details.
