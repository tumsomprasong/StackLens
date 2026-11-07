# Contributing to StackLens

Thank you for your interest in contributing to **StackLens**! As a 100% open-source (`GPL-3.0-only`), serverless browser extension, we welcome bug fixes, technology signature additions, performance improvements, and documentation enhancements from the community.

---

## 🌟 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to the maintainers.

---

## 🛠️ Getting Started with Local Development

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **Browser**: Any Chromium-based browser (**Google Chrome**, **Microsoft Edge**, **Brave**, **Arc**)

### 2. Setup
1. Fork and clone the repository:
   ```bash
   git clone https://github.com/<your-username>/StackLens.git
   cd StackLens
   ```
2. Load the unpacked extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (top-right toggle)
   - Click **Load unpacked** and select the root `StackLens` directory.
3. Test your changes live:
   - Make edits to `src/`, `popup/`, or `rules/`.
   - Click the reload icon (🔄) on the StackLens card in `chrome://extensions/` to apply changes.

---

## 🧩 Adding or Updating Technology Signatures

StackLens detects technologies across **109 categories** using multi-layer rules (headers, cookies, scripts, HTML DOM, CSS, JS globals, DNS).

### How Signatures Work
1. **Source of Truth**: Custom modern signatures are maintained in `scripts/fetch-rules.mjs` within the `CUSTOM_2026_TECHNOLOGIES` object.
2. **Rule Schema**:
   ```javascript
   "Technology Name": {
     "cats": [1, 12],                // Category IDs (see rules/categories.json)
     "description": "Short summary",
     "website": "https://example.com",
     "icon": "example.svg",
     "headers": { "X-Powered-By": "^Example(?:/([\\d.]+))?" },
     "cookies": { "example_session": "" },
     "scripts": "(?:/|_next/static/chunks/example-([\\d.]+)\\.js)",
     "dom": {
       "div[data-example]": { "attributes": { "data-example": "" } }
     },
     "js": { "window.Example.version": "([\\d.]+)" },
     "css": [":root { --example-var:" ],
     "implies": ["ParentTech"]
   }
   ```
3. **Re-generating Rules**:
   Run the build script to fetch upstream rules and merge custom signatures:
   ```bash
   npm run update-rules
   ```

---

## 🧪 Testing Your Changes

Before submitting a Pull Request, please ensure:
1. **Manifest V3 Compatibility**: Verify background service worker lifecycle (`src/background.js`) functions without console errors.
2. **Privacy Standards**: Never introduce telemetry, tracking pixels, or external transmission of user browsing history or token secrets.
3. **Packaging Check**: Ensure the extension packs cleanly without warnings:
   ```bash
   npm run pack
   ```

---

## 📬 Submitting a Pull Request (PR)

1. Create a dedicated branch for your feature or bugfix:
   ```bash
   git checkout -b feature/add-new-tech-signature
   ```
2. Commit your changes with clear, descriptive commit messages:
   ```bash
   git commit -m "feat(rules): add detection for ElysiaJS framework"
   ```
3. Push to your fork and open a Pull Request against the `main` branch.
4. Fill out the provided **Pull Request Template** describing what changed and how you tested it.

---

## 📜 Licensing

By contributing to StackLens, you agree that your contributions will be licensed under the **GNU General Public License v3.0 (`GPL-3.0-only`)**.

