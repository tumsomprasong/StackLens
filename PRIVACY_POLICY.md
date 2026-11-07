# Privacy Policy for StackLens

**Effective Date:** November 5, 2026  
**Last Updated:** November 5, 2026  
**Extension Name:** StackLens - Web Tech, Infra & Security Analyzer  
**Chrome Web Store:** [View on Chrome Web Store](https://chromewebstore.google.com/detail/jfmfbmjkafbmimefoomiejfpjdflhbdm)  
**License:** GNU General Public License v3.0 (`GPL-3.0-only`)

---

## 1. Overview & Zero-Data-Collection Commitment

**StackLens** is a 100% free, open-source, serverless browser extension that detects web technologies, DNS/IP infrastructure, known CVE library vulnerabilities, and publicly visible page metadata.

**We do NOT collect, store, transmit, rent, or sell any personal data, browsing history, or user telemetry.** StackLens operates without any proprietary backend server, analytics tracker, or user account system.

---

## 2. How StackLens Processes Data Locally

All webpage inspection happens **locally within your browser** on your device:

1. **DOM, Script, CSS & Header Inspection**:
   - StackLens reads the active webpage's HTML structure, JavaScript global variables, CSS custom properties, and HTTP response headers strictly in local browser memory to match against our bundled open-source technology fingerprint database (`rules/technologies.json`).
2. **Cookies & Web Storage Inspection**:
   - StackLens checks cookie names and public session format patterns (such as `PHPSESSID`, `ASP.NET_SessionId`, `next-auth.session-token`, or `KEYCLOAK_IDENTITY`) and public JWT issuer (`iss`) metadata locally to identify authentication frameworks.
   - **Raw cookie values, session tokens, passwords, and private credentials are never stored, logged, or transmitted outside your browser.**
3. **Lead & Metadata Extraction**:
   - Contact emails, phone links, social profile links, OpenGraph tags, and `application/ld+json` (Schema.org) blocks displayed in the **Leads** tab are extracted directly from the active webpage's DOM in real time. If you choose to export a JSON or CSV report, the file is generated locally and saved directly to your computer.
4. **Local Caching (`chrome.storage.local`)**:
   - To improve speed and reduce redundant network requests, StackLens caches DNS, IP, and CVE lookup results in your browser's local storage (`chrome.storage.local`) with a 24-hour expiration (TTL), along with your Dark/Light theme preference. Tab reports are automatically cleared when you close the tab.

---

## 3. Direct Third-Party Public API Requests

Because StackLens is 100% serverless, your browser queries three standard public APIs directly to provide **Plus** infrastructure and security insights:

| Feature | Public API Endpoint | Data Sent in Request | Provider Privacy Policy |
| :--- | :--- | :--- | :--- |
| **DNS Records (DoH)** | `https://cloudflare-dns.com/dns-query` | Active tab's **domain name** (e.g., `example.com`) | [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/) |
| **IP & ASN Lookup** | `https://ipwho.is/<ip>` | Resolved public **IPv4 address** of the website | [ipwho.is Privacy Policy](https://ipwho.is/privacy-policy) |
| **CVE Security Audit** | `https://api.osv.dev/v1/query` | Detected **open-source library name & version** (e.g., `jquery 3.6.0`) | [Google / OSV Privacy Policy](https://policies.google.com/privacy) |
| **Technology Icons** | `https://raw.githubusercontent.com/...` | Icon filename for display in the popup UI | [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) |

No personal identifiers, cookies, URL paths, query parameters, or form inputs are ever sent to these public APIs.

---

## 4. Chrome Extension Permissions Justification

StackLens requests only the permissions strictly necessary to perform its single purpose:

- **`activeTab` & `scripting`**: Used to inspect the current webpage and re-run the scanner when you click the **Rescan** button.
- **`webRequest`**: Used in read-only mode to inspect HTTP response headers (such as `Server` and `X-Powered-By`) on the active tab.
- **`cookies`**: Used in read-only mode to match cookie names and public SSO issuer patterns against technology rules locally.
- **`storage`**: Used to store 24-hour local cache entries for DNS/IP/CVE lookups and your UI theme preference (`dark` / `light`).
- **`tabs`**: Used to read the active tab's hostname and update the detected technology count badge on the toolbar icon.
- **`host_permissions` (`<all_urls>`)**: Required so StackLens can analyze any website you visit and query the public DNS, IP, and OSV.dev APIs.

---

## 5. Compliance with Chrome Web Store User Data Policy

The use of information received from Google Chrome APIs adheres strictly to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/), including the **Limited Use** requirements.

---

## 6. Open Source Transparency & Contact

StackLens is open-source software licensed under the **GNU General Public License v3.0 (`GPL-3.0-only`)**. Anyone can audit the complete source code to verify our privacy practices.

If you have questions or concerns regarding this Privacy Policy, please open an issue in our official GitHub repository.

---
---

# นโยบายความเป็นส่วนตัว (Privacy Policy — ภาษาไทย)

**วันที่มีผลบังคับใช้:** 5 พฤศจิกายน 2026  
**ชื่อส่วนขยาย:** StackLens - Web Tech, Infra & Security Analyzer

### 1. คำมั่นสัญญาในการไม่เก็บข้อมูลผู้ใช้ (Zero Data Collection)
**StackLens** เป็นส่วนขยายเบราว์เซอร์แบบ Open-Source และทำงานแบบ **Serverless 100%** เรา **ไม่เก็บรวบรวม ไม่บันทึก ไม่ส่งออก และไม่จำหน่าย** ข้อมูลส่วนบุคคล ประวัติการเข้าชมเว็บไซต์ (Browsing History) หรือพฤติกรรมการใช้งานใดๆ ของผู้ใช้งานทั้งสิ้น

### 2. การประมวลผลข้อมูลภายในเครื่อง (Local Processing)
- การตรวจสอบ HTML, DOM, CSS, JavaScript, HTTP Response Headers และ Cookies ทั้งหมดเกิดขึ้น **ภายในหน่วยความจำของเบราว์เซอร์บนเครื่องของคุณเท่านั้น** เพื่อเทียบกับฐานข้อมูล `rules/technologies.json`
- การตรวจสอบ Cookies และ JWT เพื่อระบุระบบยืนยันตัวตน (เช่น Keycloak, NextAuth, Entra ID) จะตรวจสอบเฉพาะชื่อคีย์และ URL ของผู้ออกโทเค็น (`iss`) ภายในเครื่อง **ไม่มีการส่งออกหรือบันทึกค่าโทเค็นลับหรือรหัสผ่านใดๆ ออกนอกเบราว์เซอร์**
- ข้อมูลอีเมล เบอร์โทรศัพท์ และลิงก์โซเชียลในแท็บ **Leads** สกัดจากหน้าเว็บที่เปิดอยู่ในขณะนั้นโดยตรง และการกดปุ่ม Export **JSON / CSV** เป็นการสร้างไฟล์ลงในเครื่องคอมพิวเตอร์ของคุณโดยตรง
- ข้อมูลแคชชั่วคราว (DNS/IP/CVE TTL 24 ชั่วโมง) และค่าโหมดสีมืด/สว่าง ถูกจัดเก็บไว้ใน `chrome.storage.local` ภายในเบราว์เซอร์ของคุณเท่านั้น

### 3. การเรียกใช้งาน Public API ภายนอกโดยตรง
เพื่อแสดงข้อมูลโครงสร้างพื้นฐานและช่องโหว่ความปลอดภัย เบราว์เซอร์ของคุณจะส่งคำขอเฉพาะข้อมูลสาธารณะของเว็บไซต์ปลายทางไปยัง Public API มาตรฐาน 3 แห่งโดยตรง:
1. **Cloudflare DoH (`cloudflare-dns.com`)**: ส่งเฉพาะชื่อโดเมน (เช่น `example.com`) เพื่อดึงระเบียน DNS
2. **ipwho.is (`ipwho.is`)**: ส่งเฉพาะหมายเลข IPv4 สาธารณะของเซิร์ฟเวอร์เว็บไซต์ เพื่อดึงข้อมูล ISP และ ASN
3. **OSV.dev (`api.osv.dev`)**: ส่งเฉพาะชื่อไลบรารีและเลขเวอร์ชัน (เช่น `jquery 3.6.0`) เพื่อตรวจสอบรายการช่องโหว่ CVE
*(ไม่มีการส่ง URL เต็ม, พารามิเตอร์ส่วนตัว, หรือคุกกี้ของผู้ใช้ไปยัง API เหล่านี้)*

