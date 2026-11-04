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
    <a href="README.md">English</a> · <strong>ภาษาไทย (Thai)</strong>
  </p>
</div>

---

**StackLens** คือส่วนขยายเบราว์เซอร์ (Chrome Extension — Manifest V3) แบบ Open-Source สำหรับวิเคราะห์และตรวจสอบเทคโนโลยีเบื้องหลังเว็บไซต์ (Web Technology Fingerprinting) เทียบเท่าระดับ **Wappalyzer Plus** แต่ปลดล็อกทุกฟีเจอร์ให้ใช้งานได้ฟรี 100% แบบ **Serverless** (ประมวลผลในเบราว์เซอร์และเชื่อมต่อกับ Public APIs มาตรฐานโดยตรง ไม่มีการส่งข้อมูลประวัติการเข้าชมไปยังเซิร์ฟเวอร์ตัวกลาง)

---

## ✨ จุดเด่นและฟีเจอร์หลัก (Core Features — 2026 Edition)

### 1. 🔍 Deep Technology Fingerprinting (`7,760+` เทคโนโลยี / `109` หมวดหมู่)
ผสานฐานข้อมูลจาก `enthec/webappanalyzer`, `projectdiscovery/wappalyzergo` และชุดกฎ **2026 Modern Web Stack** ที่ออกแบบมาเพื่อสถาปัตยกรรมเว็บยุคปัจจุบันโดยเฉพาะ:
- **Multi-Layer Inspection**: ตรวจสอบครบทุกช่องทาง ได้แก่ URL, HTTP Response Headers (พร้อม Active `HEAD`/`GET` Probe), Cookies (รองรับทั้ง `HttpOnly` และ Regex Keys), Meta Tags, External & Inline `<script>`, **Compiled JS Bundles (จาก Browser Cache)**, **Stylesheets & CSS Variables (`rule.css`)**, **DOM Selectors (`1,800+` รูปแบบ)**, **JS Global Variables (`MAIN` World)** และ **DNS Records (`rule.dns`)**
- **2026 Modern Frontend & UI Stack**:
  - ตรวจจับ **React 18 / 19** (ผ่าน Fiber Root `__reactContainer$` / `__reactFiber$`), **Next.js 15 / 16 App Router** (`self.__next_f` RSC Payload แม้ซ่อน Header `X-Powered-By`), **Turbopack**, **Vite**, **Vue 3 / Nuxt 3–4**, **Svelte 5 / SvelteKit**, **Astro**, **Remix**, **Qwik**, **HTMX**
  - ตรวจจับ **Tailwind CSS (v3 & v4)**, **shadcn/ui**, **Radix UI**, **DaisyUI**, **HeroUI (NextUI)**, **Ant Design**, **Material UI**, **Chakra UI**, **Mantine** รวมถึงชุดไอคอน **Lucide**, **Tabler Icons**, **Phosphor Icons**
  - ตรวจจับไลบรารีจัดการสถานะและข้อมูล เช่น **TanStack Query / Router / Start**, **tRPC**, **Zustand**, **GraphQL / Apollo**
- **Deep Authentication & SSO Heuristics (`Category 69`)**:
  - รองรับการตรวจจับ **Keycloak**, **NextAuth.js (Auth.js v4/v5)**, **Better Auth**, **Clerk**, **Kinde**, **WorkOS (AuthKit)**, **Stytch**, **Descope**, **Logto**, **OpenID Connect (OIDC)**, **OAuth 2.0**, **SAML 2.0**, **Microsoft Entra ID (Azure AD)**, **ADFS**, **Authentik**, **Authelia**, **Shibboleth**, **WSO2 Identity Server**, **Ping Identity**, **ForgeRock**, **FusionAuth**, **Zitadel**, **Ory**, **SuperTokens**, **Supabase Auth**, **Firebase Authentication**, **Apereo CAS**, และ **ThaID (DOPA Digital ID)**
  - **JWT Payload Inspector & NextAuth Provider Discovery**: ถอดรหัสเฉพาะโครงสร้างส่วนหัว/Claims ของ JWT (เช่น `iss`, `realm_access`, `resource_access`) จาก Cookies และ Web Storage แบบปลอดภัยในเครื่อง พร้อมตรวจสอบ `/api/auth/providers` อัตโนมัติสำหรับเว็บที่ใช้ NextAuth
- **Deep Web Server & OS Inference**:
  - ตรวจจับ **IIS** และ **Windows Server** ได้แม้ถูกคั่นด้วย Reverse Proxy / CDN หรือตั้งค่าซ่อน `Server` Header โดยวิเคราะห์ร่วมกับสัญญาณของ ASP.NET, ARR, `Microsoft-HTTPAPI`, Header เฉพาะของฝั่ง Windows และ Sub-requests บนโดเมนเดียวกัน
- **AI, Cloud, Serverless DB & APAC Payment Gateways**:
  - **AI / LLM**: **Vercel AI SDK**, **Google Gemini**, **OpenAI**, **Anthropic**, **Dify**, **Flowise**, **Voiceflow**, **Chainlit**, **Gradio**
  - **Cloud & BaaS**: **Cloudflare Pages / Workers**, **Vercel**, **Netlify**, **Supabase**, **Firebase**, **Convex**, **PocketBase**, **Upstash**, **Neon**, **Turso**
  - **Payments**: **Stripe**, **Polar**, **Omise (Opn Payments)**, **2C2P**, **GBPrimePay**, **ChillPay**, **Beam Checkout**

---

### 2. 🌐 Infrastructure & DNS Intelligence (Plus Feature)
- **Cloudflare DNS over HTTPS (DoH `1.1.1.1`)**: ดึงข้อมูลระเบียน DNS (`A`, `AAAA`, `CNAME`, `MX`, `NS`, `TXT`) แบบเข้ารหัสและรวดเร็ว
- **IP, ASN & Hosting Geolocation (`ipwho.is`)**: แสดงหมายเลข IPv4, ผู้ให้บริการ ISP / Hosting, องค์กร (Organization), เลข ASN (`ASxxxx`) และพิกัดภูมิศาสตร์ (เมือง / ภูมิภาค / ประเทศ) พร้อมปุ่มคัดลอก IP
- **Live HTTP Response Headers**: แสดงรายการ HTTP Headers ทั้งหมดที่ตอบกลับมาจากเซิร์ฟเวอร์ของแท็บปัจจุบัน

---

### 3. 🛡️ Automated Security & CVE Vulnerability Scanner (Plus Feature)
- นำรายชื่อไลบรารีและเลขเวอร์ชันที่ตรวจพบไปตรวจสอบกับฐานข้อมูลช่องโหว่สากล **[OSV.dev API](https://osv.dev/)** โดยอัตโนมัติ
- แสดงรายการช่องโหว่ (CVE / GHSA ID), ระดับความรุนแรง (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), คำอธิบายช่องโหว่ และลิงก์ไปยังหน้า Advisory โดยตรง

---

### 4. 📇 Lead & Metadata Extractor (Plus Feature)
- กวาดข้อมูลติดต่อจากหน้าเว็บโดยอัตโนมัติ: **อีเมล (`mailto:` และข้อความบนหน้าเว็บ)**, **เบอร์โทรศัพท์ (`tel:`)** พร้อมปุ่ม **Copy** รายตัวและ **Copy All Emails**
- สกัดลิงก์โปรไฟล์ **Social Media** (`LinkedIn`, `X/Twitter`, `Facebook`, `Instagram`, `GitHub`, `YouTube`)
- แสดงข้อมูล **OpenGraph Meta** และตัวอ่านโครงสร้าง **Schema.org (`application/ld+json`)** พร้อมปุ่ม **Copy JSON**

---

### 5. 🎨 High-Density 2-Column UI, Dark/Light Theme & One-Click Export
- **Balanced 2-Column Masonry Layout**: จัดวางหมวดหมู่เทคโนโลยีในแท็บ **Stack** แบบ 2 คอลัมน์ที่คำนวณสมดุลความสูงอัตโนมัติ แสดงข้อมูลได้แน่นและครบถ้วนโดยไม่มีพื้นที่ว่างเสียเปล่า
- **Dark / Light Mode Toggle (☀️ / 🌙)**: รองรับทั้งโหมดมืด (**Deep Indigo & Electric Cyan**) และโหมดสว่างความคมชัดสูง (**WCAG AA Contrast**) พร้อมจดจำค่าที่เลือกไว้ทันที
- **Keyboard Shortcuts**:
  - กด `/` เพื่อโฟกัสช่องค้นหาเทคโนโลยีหรือหมวดหมู่ทันที
  - กด `Esc` เพื่อล้างคำค้นหา
  - กด `ArrowLeft` / `ArrowRight` เพื่อสลับแท็บ
- **Export JSON / CSV & 24-Hour Smart Cache**: ส่งออกรายงานทั้งหมดเป็นไฟล์ `.json` หรือ `.csv` ได้ในคลิกเดียว พร้อมระบบแคชข้อมูล DNS/IP/CVE ลงใน `chrome.storage.local` (TTL 24 ชั่วโมง)

---

## 📁 โครงสร้างโปรเจกต์ (Directory Structure)

```text
stacklens/
├── LICENSE                     # สัญญาอนุญาต GNU GPL v3.0 (GPL-3.0-only)
├── README.md                   # เอกสารหลักภาษาอังกฤษ (English)
├── README.th.md                # คู่มือการติดตั้งและเอกสารประกอบภาษาไทย
├── manifest.json               # Chrome Extension Manifest V3
├── package.json                # สคริปต์จัดการฐานข้อมูลและไอคอน
├── assets/
│   ├── logo.svg                # โลโก้หลักของ StackLens (Vector SVG)
│   ├── icon-16.png             # ไอคอนส่วนขยายขนาด 16x16
│   ├── icon-48.png             # ไอคอนส่วนขยายขนาด 48x48
│   └── icon-128.png            # ไอคอนส่วนขยายขนาด 128x128
├── scripts/
│   ├── fetch-rules.mjs         # สคริปต์ดึงและรวมฐานข้อมูลเทคโนโลยี 2026 (7,760+ รายการ)
│   └── generate-icons.mjs      # สคริปต์เรนเดอร์ไอคอน PNG จากเรขาคณิตของโลโก้แบบ 4x Supersampling
├── rules/
│   ├── categories.json         # หมวดหมู่เทคโนโลยี (109 หมวดหมู่)
│   └── technologies.json       # ฐานข้อมูลกฎการตรวจจับรวม (7,760+ เทคโนโลยี)
├── src/
│   ├── background.js           # Service Worker: ดัก Headers/Redirects, Active Probe, DoH DNS, IP, OSV CVE, Cache
│   ├── content.js              # Content Script: สแกน DOM, Stylesheets (CSS), Cached JS Chunks, JWT & Leads
│   ├── inject.js               # Main World Script: ตรวจจับตัวแปร Global และ React 18/19 Fiber / Vue 3 Roots
│   └── matcher.js              # Rule Engine: ประมวลผลกฎทั้งหมด + Deep Server & Auth/SSO Heuristics
└── popup/
    ├── popup.html              # โครงสร้างหน้าต่าง Workbench 4 แท็บหลัก
    ├── popup.css               # สไตล์ UI แบบ 2-Column Masonry รองรับทั้ง Dark Mode และ Light Mode
    └── popup.js                # ควบคุมการแสดงผลแบบ Real-time, ตัวกรองค้นหา, สลับธีม และ Export JSON/CSV
```

---

## 🚀 วิธีติดตั้งใช้งาน (Installation Guide)

สามารถติดตั้งลงในเบราว์เซอร์ตระกูล Chromium ได้ทั้งหมด (**Google Chrome**, **Microsoft Edge**, **Brave**, **Arc**, **Vivaldi**):

1. **ดาวน์โหลดหรือ Clone โปรเจกต์**:
   ```bash
   git clone https://github.com/your-username/stacklens.git
   cd stacklens
   ```
2. **เปิดหน้าจัดการส่วนขยายของเบราว์เซอร์**:
   - พิมพ์ `chrome://extensions/` ในช่อง URL ของ Google Chrome (หรือ `edge://extensions/` สำหรับ Edge)
3. **เปิดโหมดนักพัฒนา (Developer mode)**:
   - เปิดสวิตช์ **Developer mode** ที่อยู่มุมขวาบนของหน้าจอ
4. **โหลดส่วนขยายเข้าสู่เบราว์เซอร์**:
   - คลิกปุ่ม **Load unpacked** (มุมซ้ายบน)
   - เลือกโฟลเดอร์ `StackLens` (โฟลเดอร์ที่มีไฟล์ `manifest.json` อยู่ข้างใน)
5. **ปักหมุดและเริ่มใช้งาน**:
   - คลิกไอคอนรูปจิ๊กซอว์ (🧩 Extensions) บนแถบเครื่องมือเบราว์เซอร์ แล้วกดปักหมุด (**Pin**) ที่ **StackLens**
   - เปิดเว็บไซต์ใดก็ได้ (`http://` หรือ `https://`) แล้วคลิกที่ไอคอน **StackLens** เพื่อดูผลลัพธ์การวิเคราะห์ทันที

---

## 🛠️ คำสั่งสำหรับนักพัฒนา (Developer Scripts)

โปรเจกต์นี้มาพร้อมไฟล์ฐานข้อมูล `rules/categories.json`, `rules/technologies.json` และไอคอนใน `assets/` ที่สร้างไว้พร้อมใช้งานแล้ว แต่หากต้องการอัปเดตฐานข้อมูลล่าสุดหรือสร้างไฟล์ไอคอนใหม่ สามารถรันคำสั่งผ่าน Node.js (v18 ขึ้นไป) ได้ดังนี้:

```bash
# อัปเดตฐานข้อมูลกฎการตรวจจับเทคโนโลยีล่าสุด (webappanalyzer + wappalyzergo + 2026 rules)
npm run update-rules

# สร้างไฟล์ไอคอน PNG (16x16, 48x48, 128x128) ใหม่ด้วย Pure Node.js
npm run generate-icons
```

---

## 🔒 ความเป็นส่วนตัวและความปลอดภัย (Privacy & Security)

- **Zero Telemetry / No Tracking**: StackLens ทำงานอยู่บนเครื่องของผู้ใช้ (Local Browser) 100% ไม่มีการเก็บประวัติการเข้าชมเว็บไซต์หรือส่งข้อมูลไปยังเซิร์ฟเวอร์ของนักพัฒนา
- **Safe JWT Inspection**: การตรวจสอบโทเค็นเพื่อระบุผู้ให้บริการ SSO (เช่น Keycloak, Entra ID, Auth0) จะอ่านเฉพาะชื่อคีย์และ URL ของ `iss` (Issuer) เท่านั้น ไม่มีการบันทึกหรือส่งออกค่าโทเค็นลับของผู้ใช้
- **Direct Public APIs**:
  - ข้อมูล DNS เรียกผ่าน `https://cloudflare-dns.com/dns-query`
  - ข้อมูล IP/ASN เรียกผ่าน `https://ipwho.is/`
  - ข้อมูลช่องโหว่ CVE เรียกผ่าน `https://api.osv.dev/v1/query`

---

## 📜 สัญญาอนุญาต (License)

เผยแพร่ภายใต้สัญญาอนุญาต **GNU General Public License v3.0 only (`GPL-3.0-only`)** ดูรายละเอียดฉบับเต็มได้ในไฟล์ [LICENSE](LICENSE)

