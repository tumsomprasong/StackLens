// scripts/fetch-rules.mjs
import fs from 'fs/promises';

const BASE_URL = 'https://raw.githubusercontent.com/enthec/webappanalyzer/main/src';
const PD_URL = 'https://raw.githubusercontent.com/projectdiscovery/wappalyzergo/main/fingerprints_data.json';
const FILES = ['_', ...'abcdefghijklmnopqrstuvwxyz'.split('')];

// Inline SVG Data URIs for custom 2026 technologies
const makeBadgeSvg = (bg, fg, label) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/><text x="32" y="41" font-family="system-ui,sans-serif" font-size="24" font-weight="800" fill="${fg}" text-anchor="middle">${label}</text></svg>`
  );

const KEYCLOAK_ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#008AAA"/><path d="M18 16h10l12 16-12 16H18l12-16-12-16zm18 0h10L34 32l12 16H36L24 32l12-16z" fill="#FFF"/></svg>`
  );

const OIDC_ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#F78C40"/><path d="M36 14v28l8-4V10l-8 4zm-4 8c-10 0-18 6-18 14s8 14 18 14c4 0 8-1 11-3l-4-5c-2 1-4 2-7 2-6 0-11-4-11-8s5-8 11-8v-6z" fill="#FFF"/></svg>`
  );

const SHIELD_AUTH_ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#4F46E5"/><path d="M32 12l16 6v11c0 11.5-6.8 21.8-16 25-9.2-3.2-16-13.5-16-25V18l16-6zm-3 26l13-13-3.5-3.5L29 31l-4.5-4.5L21 30l8 8z" fill="#22D3EE"/></svg>`
  );

/**
 * Comprehensive 2026 Technology Fingerprint Additions & Enhancements across all categories:
 * - Category 12 / 18 / 57 / 59: Modern JS Frameworks, Meta-frameworks, State & Data Fetching
 * - Category 66 / 17: 2026 UI Frameworks, Design Systems, CSS Engines & Icon Libraries
 * - Category 69 / 16: Authentication, SSO, IAM & Anti-Bot Security
 * - Category 112: Artificial Intelligence, LLM SDKs & AI Chat Widgets
 * - Category 10 / 78: Modern Privacy-First Analytics, RUM & Observability
 * - Category 31 / 34 / 62 / 88: Edge Cloud, Serverless Databases, BaaS & PaaS
 * - Category 41: Global & APAC / Thai Payment Gateways
 */
const CUSTOM_2026_TECHNOLOGIES = {
  // =========================================================================
  // 1. Modern JS Frameworks, Bundlers & State Libraries (2026)
  // =========================================================================
  "React": {
    cats: [12],
    cpe: "cpe:2.3:a:facebook:react:*:*:*:*:*:*:*:*",
    description: "React is an open-source JavaScript library for building user interfaces or UI components (including React 18/19 Fiber & Server Components).",
    icon: "React.svg",
    website: "https://react.dev",
    dom: {
      "body > div": { properties: { "_reactRootContainer": "" } },
      "div[id*='react-root'], div[id='root'], div[id='__next']": { exists: "\\;confidence:40" }
    },
    html: ["<[^>]+data-react"],
    js: {
      "React.version": "^([\\d\\.]+)$\\;version:\\1",
      "__REACT_FIBER_ROOT__": "",
      "__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers": "\\;confidence:80",
      "__isReactFizzContext": ""
    },
    scriptSrc: [
      "react(?:-dom)?(?:-with-addons)?[.-](\\d+(?:\\.\\d+)+)[^/]*\\.js\\;version:\\1",
      "/([\\d\\.]+)/react(?:\\.min)?\\.js\\;version:\\1"
    ]
  },

  "Next.js": {
    cats: [12, 18, 22, 57],
    cookies: { "NEXT_LOCALE": "" },
    cpe: "cpe:2.3:a:vercel:next.js:*:*:*:*:*:*:*:*",
    description: "Next.js is a React framework for production web applications supporting hybrid static & server rendering, App Router, and React Server Components.",
    headers: {
      "x-powered-by": "^Next\\.js ?([0-9.]+)?\\;version:\\1",
      "x-nextjs-cache": "",
      "x-nextjs-matched-path": "",
      "x-nextjs-prerender": ""
    },
    dom: [
      "script[src*='/_next/static/']",
      "link[href*='/_next/static/']",
      "div#__next"
    ],
    icon: "Next.js.svg",
    implies: ["React"],
    js: {
      "__NEXT_DATA__": "",
      "__NEXT_F__": "",
      "next.version": "^(.+)$\\;version:\\1"
    },
    scriptSrc: ["/_next/static/"],
    scripts: ["self\\.__next_f\\.push"],
    website: "https://nextjs.org"
  },

  "Next.js App Router": {
    cats: [12, 18],
    description: "Next.js App Router built on React Server Components (RSC) and Suspense.",
    icon: "Next.js.svg",
    website: "https://nextjs.org/docs/app",
    js: { "__NEXT_F__": "" },
    scripts: ["self\\.__next_f\\.push"],
    implies: ["Next.js", "React"]
  },

  "Turbopack": {
    cats: [47],
    description: "Turbopack is an incremental Rust-based bundler integrated into Next.js.",
    icon: "Turbopack.svg",
    website: "https://nextjs.org/docs/app/api-reference/turbopack",
    js: { "TURBOPACK": "", "TURBOPACK.push": "" },
    scriptSrc: ["/_next/static/chunks/turbopack-"],
    scripts: ["TURBOPACK"],
    implies: ["Next.js"]
  },

  "Vite": {
    cats: [19, 47],
    description: "Vite is a next-generation frontend build tool and development server.",
    icon: "vite.svg",
    website: "https://vite.dev",
    dom: [
      "script#vite-legacy-polyfill",
      "script#vite-legacy-entry",
      "link[href*='vite.svg'][rel='icon']",
      "script[type='module'][crossorigin][src*='/assets/index-']",
      "link[rel='modulepreload'][href*='/assets/']"
    ],
    js: { "__vite_is_modern_browser": "" }
  },

  "Vue.js": {
    cats: [12],
    description: "Vue.js is a progressive JavaScript framework for building web user interfaces.",
    icon: "Vue.js.svg",
    website: "https://vuejs.org",
    dom: ["[data-v-app]"],
    js: {
      "Vue.version": "(.+)\\;version:\\1",
      "__VUE__": "",
      "__VUE_ROOT__": ""
    }
  },

  "Nuxt.js": {
    cats: [12, 18, 57],
    description: "Nuxt is an intuitive Vue framework for building full-stack web applications.",
    icon: "Nuxt.js.svg",
    website: "https://nuxt.com",
    dom: [
      "div#__nuxt",
      "script[src*='/_nuxt/']",
      "link[href*='/_nuxt/']"
    ],
    js: {
      "__NUXT__": "",
      "$nuxt": ""
    },
    scriptSrc: ["/_nuxt/"],
    implies: ["Vue.js"]
  },

  "TanStack Query": {
    cats: [59],
    description: "TanStack Query (formerly React Query) is an asynchronous state management and data fetching library for web applications.",
    icon: makeBadgeSvg("#FF4154", "#FFF", "TQ"),
    website: "https://tanstack.com/query",
    js: { "__TANSTACK_QUERY_DEVTOOLS__": "" },
    scripts: ["@tanstack/react-query", "QueryClientProvider"]
  },

  "TanStack Router": {
    cats: [12, 59],
    description: "TanStack Router is a fully type-safe router for React and Solid applications.",
    icon: makeBadgeSvg("#009688", "#FFF", "TR"),
    website: "https://tanstack.com/router",
    js: { "__TSR__": "", "$tsr": "" },
    scripts: ["__TSR__", "@tanstack/react-router"]
  },

  "TanStack Start": {
    cats: [12, 18],
    description: "TanStack Start is a full-stack React and Solid framework powered by TanStack Router, Vinxi, and Nitro.",
    icon: makeBadgeSvg("#0EA5E9", "#FFF", "TS"),
    website: "https://tanstack.com/start",
    js: { "__TSR__": "" },
    scripts: ["@tanstack/start"],
    implies: ["TanStack Router"]
  },

  "tRPC": {
    cats: [59, 47],
    description: "tRPC enables end-to-end typesafe APIs without schemas or code generation.",
    icon: makeBadgeSvg("#398CCB", "#FFF", "tR"),
    website: "https://trpc.io",
    xhr: ["/api/trpc/"],
    scripts: ["@trpc/client", "/api/trpc"]
  },

  "Zustand": {
    cats: [59],
    description: "Zustand is a small, fast, and scalable bearbones state-management solution for React.",
    icon: makeBadgeSvg("#433E38", "#FFF", "Zu"),
    website: "https://zustand-demo.pmnd.rs",
    scripts: ["zustand/middleware"]
  },

  "HTMX": {
    cats: [12, 59],
    description: "htmx allows you to access AJAX, CSS Transitions, WebSockets and Server Sent Events directly in HTML, using attributes.",
    icon: "htmx.svg",
    website: "https://htmx.org",
    dom: [
      "[hx-get]",
      "[hx-post]",
      "[hx-target]",
      "[hx-swap]",
      "[data-hx-get]",
      "[data-hx-post]"
    ],
    js: {
      "htmx.version": "(.+)\\;version:\\1"
    },
    scriptSrc: ["htmx\\.org(?:@([\\d.]+))?\\;version:\\1", "htmx(?:\\.min)?\\.js"]
  },

  // =========================================================================
  // 2. UI Frameworks, CSS Systems & Icon Libraries (2026)
  // =========================================================================
  "Tailwind CSS": {
    cats: [66],
    description: "Tailwind CSS is a utility-first CSS framework for rapidly building modern user interfaces (supports v3 & v4).",
    icon: "tailwindcss.svg",
    website: "https://tailwindcss.com",
    css: [
      "--tw-(?:rotate|translate|space-x|text-opacity|border-opacity|bg-opacity|scale|ring|blur|shadow|brightness|contrast|gradient)",
      "--color-(?:slate|gray|zinc|neutral|stone|indigo|cyan|emerald|rose|amber)-\\d00",
      "tailwindcss v([\\d.]+)\\;version:\\1"
    ],
    dom: {
      "link[rel='stylesheet'][href*='tailwind']": {
        attributes: {
          "href": "tailwindcss[@|/](?:\\^)?([\\d.]+)\\;version:\\1"
        }
      },
      "[class*='flex '][class*='items-center'][class*='justify-between']": {
        exists: "\\;confidence:75"
      },
      "[class*='rounded-'][class*='px-'][class*='py-']": {
        exists: "\\;confidence:75"
      }
    },
    js: {
      "tailwind": ""
    },
    scriptSrc: ["cdn\\.tailwindcss\\.com"]
  },

  "shadcn/ui": {
    cats: [66],
    description: "shadcn/ui is a collection of beautifully designed, accessible components built with Radix UI / Base UI and Tailwind CSS.",
    icon: "shadcn-ui.svg",
    website: "https://ui.shadcn.com",
    oss: true,
    css: [
      "--destructive-foreground",
      "--popover-foreground",
      "--muted-foreground",
      "--sidebar-foreground",
      "--color-destructive-foreground",
      "--color-muted-foreground"
    ],
    dom: [
      "[data-slot='button']",
      "[data-slot='card']",
      "[data-slot='dialog-content']",
      "[data-slot='dropdown-menu-content']",
      "[data-slot='input']"
    ],
    implies: ["Tailwind CSS"]
  },

  "Radix UI": {
    cats: [66],
    description: "Radix Primitives is an open-source UI component library for building accessible, high-quality design systems and web apps in React.",
    icon: "Radix UI.svg",
    website: "https://www.radix-ui.com",
    oss: true,
    css: [
      "--radix-accordion-content-height",
      "--radix-dropdown-menu-content-transform-origin",
      "--radix-popper-transform-origin",
      "--radix-select-trigger-width",
      "--radix-tooltip-content-transform-origin"
    ],
    dom: [
      "[data-radix-collection-item]",
      "[data-radix-popper-content-wrapper]",
      "[data-radix-scroll-area-viewport]",
      "[id^='radix-']"
    ],
    implies: ["React"]
  },

  "DaisyUI": {
    cats: [66],
    description: "daisyUI is the most popular component library for Tailwind CSS.",
    icon: makeBadgeSvg("#1AD1A5", "#0F172A", "dUI"),
    website: "https://daisyui.com",
    oss: true,
    css: ["--rounded-box", "--rounded-btn", "--animation-btn", "--btn-text-case"],
    dom: ["html[data-theme] .btn.btn-primary", ".Swap-on", ".drawer-toggle"],
    implies: ["Tailwind CSS"]
  },

  "HeroUI": {
    cats: [66],
    description: "HeroUI (formerly NextUI) is a modern React UI library based on Tailwind CSS and React Aria.",
    icon: makeBadgeSvg("#006FEE", "#FFF", "H"),
    website: "https://www.heroui.com",
    oss: true,
    css: ["--heroui-", "--nextui-"],
    dom: ["[data-slot='base'][data-filled]"],
    implies: ["React", "Tailwind CSS"]
  },

  "Lucide": {
    cats: [17],
    description: "Lucide is an open-source icon toolkit providing 1,500+ clean, consistent vector SVG icons.",
    icon: "Lucide.svg",
    website: "https://lucide.dev",
    oss: true,
    dom: ["svg.lucide", "svg[class*='lucide-']", "i[data-lucide]"]
  },

  "Tabler Icons": {
    cats: [17],
    description: "Tabler Icons is a set of over 5,000 free MIT-licensed high-quality SVG icons.",
    icon: makeBadgeSvg("#206BC4", "#FFF", "Ti"),
    website: "https://tabler.io/icons",
    oss: true,
    dom: ["svg.icon-tabler", "i[class*='ti ti-']"]
  },

  "Phosphor Icons": {
    cats: [17],
    description: "Phosphor is a flexible icon family for interfaces, diagrams, presentations.",
    icon: makeBadgeSvg("#C4E456", "#0F172A", "Ph"),
    website: "https://phosphoricons.com",
    oss: true,
    dom: ["i[class*='ph-']", "svg[class*='ph-']"]
  },

  // =========================================================================
  // 3. Authentication, SSO & IAM (Category 69 — 2026)
  // =========================================================================
  "Keycloak": {
    cats: [69],
    cpe: "cpe:2.3:a:redhat:keycloak:*:*:*:*:*:*:*:*",
    description:
      "Keycloak is an open-source Identity and Access Management (IAM) solution sponsored by Red Hat for modern applications and services supporting OpenID Connect, OAuth 2.0, and SAML 2.0.",
    icon: KEYCLOAK_ICON,
    website: "https://www.keycloak.org",
    oss: true,
    cookies: {
      "KEYCLOAK_IDENTITY": "",
      "KEYCLOAK_IDENTITY_LEGACY": "",
      "KEYCLOAK_SESSION": "",
      "KEYCLOAK_SESSION_LEGACY": "",
      "KEYCLOAK_LOCALE": "",
      "KEYCLOAK_REMEMBER_ME": "",
      "KEYCLOAK_3P_COOKIE": "",
      "AUTH_SESSION_ID": "",
      "AUTH_SESSION_ID_LEGACY": "",
      "KC_RESTART": "",
      "KC_STATE_CHECKER": "",
      "OAuth_Token_Request_State": ""
    },
    dom: [
      "#kc-header",
      "#kc-form-login",
      "#kc-content-wrapper",
      "#kc-locale",
      "form[action*='login-actions/authenticate']",
      "form[action*='/protocol/openid-connect/']",
      "a[href*='/protocol/openid-connect/']",
      "iframe[src*='login-status-iframe.html']",
      "iframe[src*='3p-cookies/step1.html']"
    ],
    headers: {
      "content-security-policy": "(?:keycloak|/realms/[^/]+/protocol/openid-connect)",
      "location": "/realms/[^/]+/protocol/(?:openid-connect|saml)"
    },
    html: [
      "/(?:auth/)?realms/[^/\"'\\s]+/protocol/openid-connect",
      "login-status-iframe\\.html",
      "class=[\"'][^\"']*login-pf-page"
    ],
    js: {
      "Keycloak": "",
      "keycloak.authenticated": "",
      "keycloak.realm": ""
    },
    scriptSrc: [
      "/(?:auth/)?js/keycloak(?:\\.min|-authz)?\\.js",
      "keycloak-js"
    ],
    scripts: [
      "/(?:auth/)?realms/[^/\"'\\s]+/protocol/openid-connect",
      "/api/auth/(?:signin|callback)/keycloak",
      "[\"']keycloak[\"']\\s*[,:\\]]\\s*\\{?[^}]*?(?:openid|clientId|realm|signinUrl|provider)",
      "signIn\\([\"']keycloak[\"']"
    ],
    xhr: [
      "/(?:auth/)?realms/[^/]+/protocol/openid-connect",
      "/(?:auth/)?realms/[^/]+/\\.well-known/openid-configuration",
      "/api/auth/(?:signin|callback)/keycloak"
    ],
    url: [
      "/(?:auth/)?realms/[^/]+/protocol/(?:openid-connect|saml)",
      "/(?:auth/)?realms/[^/]+/login-actions/"
    ],
    implies: ["OpenID Connect"]
  },

  "NextAuth.js": {
    cats: [69],
    description:
      "NextAuth.js (Auth.js) is a complete open-source authentication solution for Next.js and modern web applications.",
    icon: "Next-Auth.png",
    website: "https://authjs.dev",
    oss: true,
    cookies: {
      "__Host-next-auth\\.csrf-token": "",
      "__Secure-next-auth\\.callback-url": "",
      "__Secure-next-auth\\.session-token": "",
      "__Secure-next-auth\\.csrf-token": "",
      "next-auth\\.session-token": "",
      "next-auth\\.csrf-token": "",
      "next-auth\\.callback-url": "",
      "next-auth\\.pkce\\.code_verifier": "",
      "next-auth\\.state": "",
      "__Host-authjs\\.csrf-token": "",
      "__Secure-authjs\\.session-token": "",
      "__Secure-authjs\\.callback-url": "",
      "authjs\\.session-token": "",
      "authjs\\.csrf-token": "",
      "authjs\\.callback-url": ""
    },
    dom: [
      "a[href*='/api/auth/signin']",
      "a[href*='/api/auth/signout']",
      "form[action*='/api/auth/']"
    ],
    scripts: [
      "/api/auth/(?:session|providers|csrf|signin|signout|callback)",
      "__NEXTAUTH",
      "next-auth/react"
    ],
    xhr: [
      "/api/auth/(?:session|providers|csrf|signin|signout|callback)"
    ],
    url: [
      "/api/auth/(?:signin|signout|callback|error|verify-request)"
    ]
  },

  "Better Auth": {
    cats: [69],
    description: "Better Auth is a comprehensive, framework-agnostic authentication and authorization library for TypeScript.",
    icon: SHIELD_AUTH_ICON,
    website: "https://www.better-auth.com",
    oss: true,
    cookies: {
      "better-auth\\.session_token": "",
      "__Secure-better-auth\\.session_token": "",
      "better-auth\\.csrf_token": ""
    },
    xhr: ["/api/auth/get-session", "/api/auth/sign-in/"]
  },

  "Clerk": {
    cats: [69],
    description: "Clerk is a complete user management and authentication platform for modern React and Next.js applications.",
    icon: "Clerk.svg",
    website: "https://clerk.com",
    cookies: {
      "__clerk_db_jwt": "",
      "__client_uat": ""
    },
    dom: [
      "[data-clerk-component]",
      ".cl-rootBox",
      ".cl-userButtonTrigger"
    ],
    headers: {
      "x-clerk-auth-status": "",
      "x-clerk-auth-reason": ""
    },
    js: {
      "Clerk": "",
      "Clerk.version": "([\\d\\.]+)\\;version:\\1"
    },
    scriptSrc: ["\\.clerk\\.accounts\\.dev/", "clerk\\.browser\\.js"]
  },

  "Kinde": {
    cats: [69],
    description: "Kinde is a modern authentication, feature flag, and billing platform for SaaS developers.",
    icon: SHIELD_AUTH_ICON,
    website: "https://kinde.com",
    cookies: {
      "kinde_token": "",
      "kbte": ""
    },
    dom: ["a[href*='.kinde.com/oauth2/']"],
    xhr: ["\\.kinde\\.com/oauth2/"]
  },

  "WorkOS": {
    cats: [69],
    description: "WorkOS provides enterprise-ready authentication (AuthKit), Single Sign-On (SAML/OIDC), and Directory Sync (SCIM).",
    icon: SHIELD_AUTH_ICON,
    website: "https://workos.com",
    cookies: { "wos-session": "" },
    dom: ["a[href*='authkit.app']", "a[href*='api.workos.com/sso/']"],
    xhr: ["api\\.workos\\.com", "\\.authkit\\.app"]
  },

  "Stytch": {
    cats: [69],
    description: "Stytch is an authentication and fraud prevention platform for developers.",
    icon: SHIELD_AUTH_ICON,
    website: "https://stytch.com",
    cookies: {
      "stytch_session": "",
      "stytch_session_jwt": ""
    },
    scriptSrc: ["js\\.stytch\\.com"],
    xhr: ["\\.stytch\\.com/v1/"]
  },

  "Descope": {
    cats: [69],
    description: "Descope is a drag-and-drop customer authentication and identity management platform.",
    icon: SHIELD_AUTH_ICON,
    website: "https://www.descope.com",
    cookies: { "DS": "", "DSR": "" },
    dom: ["descope-wc"],
    xhr: ["api\\.descope\\.com"]
  },

  "Logto": {
    cats: [69],
    description: "Logto is an open-source Auth0 alternative designed for modern apps and SaaS products.",
    icon: SHIELD_AUTH_ICON,
    website: "https://logto.io",
    oss: true,
    cookies: { "_interaction": "", "_logto": "" },
    xhr: ["/oidc/auth", "/oidc/token"]
  },

  "OpenID Connect": {
    cats: [69],
    description:
      "OpenID Connect (OIDC) is an identity authentication layer on top of the OAuth 2.0 protocol.",
    icon: OIDC_ICON,
    website: "https://openid.net/connect/",
    dom: [
      "a[href*='scope=openid']",
      "a[href*='/protocol/openid-connect/']",
      "iframe[src*='openid-connect']"
    ],
    scripts: [
      "\\.well-known/openid-configuration",
      "/protocol/openid-connect/",
      "oidc-client"
    ],
    xhr: [
      "\\.well-known/openid-configuration",
      "/protocol/openid-connect/"
    ],
    implies: ["OAuth 2.0"]
  },

  "OAuth 2.0": {
    cats: [69],
    description:
      "OAuth 2.0 is the industry-standard protocol for authorization and delegated authentication.",
    icon: SHIELD_AUTH_ICON,
    website: "https://oauth.net/2/",
    dom: [
      "a[href*='response_type=code'][href*='client_id=']",
      "a[href*='/oauth2/authorize']",
      "a[href*='/oauth/authorize']"
    ],
    xhr: ["/oauth2?/(?:authorize|token|userinfo)"]
  },

  "SAML 2.0": {
    cats: [69],
    description:
      "Security Assertion Markup Language 2.0 (SAML 2.0) is an XML-based standard for exchanging authentication and authorization data between an Identity Provider (IdP) and a Service Provider (SP).",
    icon: SHIELD_AUTH_ICON,
    website: "https://wiki.oasis-open.org/security",
    cookies: { "_saml_idp": "", "SAMLSession": "" },
    dom: [
      "input[name='SAMLRequest']",
      "input[name='SAMLResponse']",
      "a[href*='SAMLRequest=']"
    ],
    url: ["[?&]SAMLRequest=", "[?&]SAMLResponse="]
  },

  "Microsoft Entra ID": {
    cats: [69],
    description:
      "Microsoft Entra ID (formerly Azure Active Directory) is Microsoft's cloud-based identity and access management service.",
    icon: "Microsoft.svg",
    website: "https://www.microsoft.com/security/business/identity-access/microsoft-entra-id",
    dom: [
      "a[href*='login.microsoftonline.com']",
      "a[href*='login.windows.net']",
      "iframe[src*='login.microsoftonline.com']"
    ],
    headers: { "content-security-policy": "login\\.microsoftonline\\.com" },
    scripts: ["login\\.microsoftonline\\.com", "@azure/msal"],
    xhr: ["login\\.microsoftonline\\.com", "graph\\.microsoft\\.com/v1\\.0/me"]
  },

  "Active Directory Federation Services (ADFS)": {
    cats: [69],
    description:
      "Active Directory Federation Services (ADFS) is a Single Sign-On (SSO) feature developed by Microsoft for Windows Server.",
    icon: "Microsoft.svg",
    website: "https://learn.microsoft.com/windows-server/identity/ad-fs/ad-fs-overview",
    cookies: {
      "MSISAuth": "",
      "MSISAuthenticated": "",
      "MSISLoopDetectionCookie": "",
      "MSISSamlRequest": ""
    },
    dom: [
      "form[action*='/adfs/ls']",
      "a[href*='/adfs/ls']",
      "a[href*='/adfs/oauth2/']"
    ],
    url: ["/adfs/(?:ls|oauth2|portal)"],
    implies: ["Windows Server", "IIS"]
  },

  "Authentik": {
    cats: [69],
    description:
      "authentik is an open-source Identity Provider focused on flexibility and versatility, supporting OIDC, SAML, LDAP, and SCIM.",
    icon: SHIELD_AUTH_ICON,
    website: "https://goauthentik.io",
    oss: true,
    cookies: { "authentik_csrf": "", "authentik_session": "" },
    dom: ["ak-flow-executor", "ak-interface-flow", "a[href*='/outpost.goauthentik.io/']"],
    url: ["/if/flow/", "/outpost\\.goauthentik\\.io/"]
  },

  "Authelia": {
    cats: [69],
    description:
      "Authelia is an open-source authentication and authorization server providing two-factor authentication and single sign-on (SSO) for web portals.",
    icon: SHIELD_AUTH_ICON,
    website: "https://www.authelia.com",
    oss: true,
    cookies: { "authelia_session": "" },
    dom: ["#authelia-portal"]
  },

  "Shibboleth": {
    cats: [69],
    description:
      "Shibboleth is an open-source federated single sign-on (SSO) and attribute exchange system widely used in universities and research institutions.",
    icon: SHIELD_AUTH_ICON,
    website: "https://www.shibboleth.net",
    oss: true,
    cookies: {
      "_shibsession_.+": "",
      "_shibstate_.+": "",
      "_opensaml_req_.+": ""
    },
    dom: ["a[href*='/Shibboleth.sso/']", "form[action*='/Shibboleth.sso/']"],
    url: ["/Shibboleth\\.sso/", "/idp/profile/SAML2/"],
    implies: ["SAML 2.0"]
  },

  "WSO2 Identity Server": {
    cats: [69],
    description:
      "WSO2 Identity Server is an open-source IAM product supporting SSO, OIDC, OAuth 2.0, and SAML 2.0.",
    icon: SHIELD_AUTH_ICON,
    website: "https://wso2.com/identity-server/",
    oss: true,
    cookies: { "commonAuthId": "", "samlssoTokenId": "" },
    url: ["/authenticationendpoint/login\\.do", "/commonauth"]
  },

  "Ping Identity": {
    cats: [69],
    description:
      "Ping Identity (PingFederate / PingOne) provides enterprise identity and access management and federated SSO.",
    icon: SHIELD_AUTH_ICON,
    website: "https://www.pingidentity.com",
    dom: [
      "form[action*='/as/authorization.oauth2']",
      "a[href*='/as/authorization.oauth2']",
      "a[href*='/idp/startSSO.ping']"
    ],
    url: ["/as/authorization\\.oauth2", "/idp/startSSO\\.ping", "/idp/SSO\\.saml2"]
  },

  "ForgeRock": {
    cats: [69],
    description:
      "ForgeRock (OpenAM) provides digital identity and access management for consumers and workforce.",
    icon: SHIELD_AUTH_ICON,
    website: "https://www.forgerock.com",
    cookies: { "iPlanetDirectoryPro": "", "amlbcookie": "" },
    url: ["/openam/XUI/", "/am/XUI/"]
  },

  "FusionAuth": {
    cats: [69],
    description:
      "FusionAuth is a customer authentication and authorization platform supporting OAuth 2.0, OIDC, and SAML.",
    icon: SHIELD_AUTH_ICON,
    website: "https://fusionauth.io",
    cookies: {
      "fusionauth.sso": "",
      "fusionauth.locale": "",
      "fusionauth.remember-device": ""
    }
  },

  "Zitadel": {
    cats: [69],
    description: "ZITADEL is an open-source identity infrastructure for cloud-native applications.",
    icon: SHIELD_AUTH_ICON,
    website: "https://zitadel.com",
    oss: true,
    cookies: { "__Host-zitadel\\.useragent": "" },
    url: ["/ui/login/login"]
  },

  "Ory": {
    cats: [69],
    description: "Ory (Kratos / Hydra) is an open-source identity and access infrastructure.",
    icon: SHIELD_AUTH_ICON,
    website: "https://www.ory.sh",
    oss: true,
    cookies: {
      "ory_kratos_session": "",
      "ory_session_.+": "",
      "csrf_token_[a-f0-9]{64}": ""
    },
    xhr: ["/self-service/(?:login|registration|recovery|settings)/flows"]
  },

  "SuperTokens": {
    cats: [69],
    description: "SuperTokens is an open-source alternative to Auth0, Firebase Auth, and AWS Cognito.",
    icon: SHIELD_AUTH_ICON,
    website: "https://supertokens.com",
    oss: true,
    cookies: {
      "sAccessToken": "",
      "sRefreshToken": "",
      "sIdRefreshToken": "",
      "st-last-access-token-update": ""
    },
    js: { "supertokens": "" }
  },

  "Firebase Authentication": {
    cats: [69],
    description: "Firebase Authentication provides backend services and SDKs to authenticate users to your app.",
    icon: "Firebase.svg",
    website: "https://firebase.google.com/products/auth",
    scriptSrc: ["firebase-auth(?:\\.min)?\\.js"],
    scripts: ["identitytoolkit\\.googleapis\\.com", "securetoken\\.googleapis\\.com", "firebase/auth"],
    xhr: ["identitytoolkit\\.googleapis\\.com", "securetoken\\.googleapis\\.com"],
    implies: ["Firebase"]
  },

  "Supabase Auth": {
    cats: [69],
    description: "Supabase Auth (GoTrue) is an open-source user management and authentication server for Postgres.",
    icon: "Supabase.svg",
    website: "https://supabase.com/auth",
    oss: true,
    cookies: { "sb-[a-z0-9]+-auth-token(?:\\.\\d+)?": "" },
    xhr: ["\\.supabase\\.co/auth/v1/"],
    implies: ["Supabase"]
  },

  "ThaID (DOPA Digital ID)": {
    cats: [69],
    description:
      "ThaID is Thailand's official digital identity authentication system operated by the Department of Provincial Administration (DOPA).",
    icon: SHIELD_AUTH_ICON,
    website: "https://www.bora.dopa.go.th",
    dom: ["a[href*='imauth.bora.dopa.go.th']", "a[href*='thaid']"],
    scripts: ["imauth\\.bora\\.dopa\\.go\\.th"],
    xhr: ["imauth\\.bora\\.dopa\\.go\\.th"]
  },

  "Laravel Sanctum": {
    cats: [69],
    description: "Laravel Sanctum provides a featherweight authentication system for SPAs and simple APIs.",
    icon: "Laravel.svg",
    website: "https://laravel.com/docs/sanctum",
    oss: true,
    xhr: ["/sanctum/csrf-cookie"],
    implies: ["Laravel", "PHP"]
  },

  // =========================================================================
  // 4. Artificial Intelligence & LLM Ecosystem (Category 112 — 2026)
  // =========================================================================
  "Vercel AI SDK": {
    cats: [112, 59],
    description: "The Vercel AI SDK is a TypeScript toolkit designed to help developers build AI-powered streaming text and chat UIs.",
    icon: "Vercel.svg",
    website: "https://sdk.vercel.ai",
    headers: { "x-vercel-ai-data-stream": "", "x-vercel-ai-ui-message-stream": "" },
    scripts: ["@ai-sdk/react", "useChat", "x-vercel-ai-"]
  },

  "Google Gemini": {
    cats: [112],
    description: "Google Gemini is Google's multimodal family of large language models and AI APIs.",
    icon: "Google.svg",
    website: "https://ai.google.dev",
    xhr: ["generativelanguage\\.googleapis\\.com"],
    scripts: ["generativelanguage\\.googleapis\\.com", "@google/genai", "@google/generative-ai"]
  },

  "Dify": {
    cats: [112, 52],
    description: "Dify is an open-source LLM app development platform for building AI workflows, RAG pipelines, and chat assistants.",
    icon: makeBadgeSvg("#155EEF", "#FFF", "Df"),
    website: "https://dify.ai",
    oss: true,
    dom: ["iframe[src*='udify.app/chatbot/']", "div#dify-chatbot-bubble-button"],
    js: { "difyChatbotConfig": "" },
    scriptSrc: ["udify\\.app/embed\\.min\\.js"]
  },

  "Flowise": {
    cats: [112, 52],
    description: "Flowise is an open-source low-code tool for developers to build customized LLM orchestration flows and AI agents.",
    icon: makeBadgeSvg("#3B82F6", "#FFF", "Fw"),
    website: "https://flowiseai.com",
    oss: true,
    dom: ["flowise-chatbot", "flowise-fullchatbot"],
    scriptSrc: ["flowise-embed"]
  },

  "Voiceflow": {
    cats: [112, 52],
    description: "Voiceflow is a collaborative AI agent design and development platform.",
    icon: makeBadgeSvg("#1E293B", "#FFF", "Vf"),
    website: "https://www.voiceflow.com",
    js: { "voiceflow.chat": "" },
    scriptSrc: ["cdn\\.voiceflow\\.com/widget"]
  },

  "Chainlit": {
    cats: [112],
    description: "Chainlit is an open-source Python package to build production-ready conversational AI interfaces.",
    icon: makeBadgeSvg("#F80061", "#FFF", "CL"),
    website: "https://chainlit.io",
    oss: true,
    dom: ["div#root > div.chainlit-app", "meta[name='chainlit-version']"]
  },

  "Gradio": {
    cats: [112, 18],
    description: "Gradio is an open-source Python package for building demos and web applications for machine learning models.",
    icon: makeBadgeSvg("#F97316", "#FFF", "Gr"),
    website: "https://www.gradio.app",
    oss: true,
    dom: ["gradio-app"],
    js: { "__gradio_mode__": "", "gradio_config": "" },
    implies: ["Python"]
  },

  // =========================================================================
  // 5. Cloud, BaaS, Serverless Databases & Edge Infrastructure (2026)
  // =========================================================================
  "Cloudflare Pages": {
    cats: [62, 88],
    description: "Cloudflare Pages is a JAMstack platform for frontend developers to collaborate and deploy websites on the Cloudflare edge network.",
    icon: "Cloudflare.svg",
    website: "https://pages.cloudflare.com",
    url: ["\\.pages\\.dev(?:$|/)"],
    implies: ["Cloudflare"]
  },

  "Cloudflare Web Analytics": {
    cats: [10, 78],
    description: "Cloudflare Web Analytics provides free, privacy-first analytics for websites without using client-side state or cookies.",
    icon: "Cloudflare.svg",
    website: "https://www.cloudflare.com/web-analytics/",
    scriptSrc: ["static\\.cloudflareinsights\\.com/beacon\\.min\\.js"],
    xhr: ["cloudflareinsights\\.com/cdn-cgi/rum"]
  },

  "Convex": {
    cats: [34, 62, 47],
    description: "Convex is a reactive backend-as-a-service and real-time database platform for full-stack TypeScript applications.",
    icon: makeBadgeSvg("#EE342F", "#FFF", "Cx"),
    website: "https://www.convex.dev",
    xhr: ["\\.convex\\.cloud/api/", "\\.convex\\.site/"],
    scripts: ["\\.convex\\.cloud"]
  },

  "PocketBase": {
    cats: [34, 47],
    description: "PocketBase is an open-source Go backend in 1 file consisting of embedded SQLite database, realtime subscriptions, and auth management.",
    icon: makeBadgeSvg("#B8DBE4", "#0F172A", "PB"),
    website: "https://pocketbase.io",
    oss: true,
    xhr: ["/api/collections/[^/]+/records", "/api/admins/auth-with-password"],
    implies: ["Go", "SQLite"]
  },

  "Upstash": {
    cats: [34, 62],
    description: "Upstash is a serverless data platform providing low-latency Redis, Vector, QStash, and Kafka over HTTP.",
    icon: makeBadgeSvg("#00E9A3", "#0F172A", "Up"),
    website: "https://upstash.com",
    xhr: ["\\.upstash\\.io"]
  },

  "Neon": {
    cats: [34, 62],
    description: "Neon is a fully managed serverless PostgreSQL database with branching and scale-to-zero.",
    icon: makeBadgeSvg("#00E599", "#0F172A", "Ne"),
    website: "https://neon.tech",
    xhr: ["\\.neon\\.tech"],
    implies: ["PostgreSQL"]
  },

  "Turso": {
    cats: [34, 62],
    description: "Turso is an edge-hosted distributed database based on libSQL (open-source fork of SQLite).",
    icon: makeBadgeSvg("#4FF8D2", "#0F172A", "Tu"),
    website: "https://turso.tech",
    xhr: ["\\.turso\\.io"]
  },

  // =========================================================================
  // 6. APAC / Thai & Modern SaaS Payment Gateways (Category 41 — 2026)
  // =========================================================================
  "2C2P": {
    cats: [41],
    description: "2C2P is a full-suite payments platform operating across Southeast Asia.",
    icon: makeBadgeSvg("#00A651", "#FFF", "2C"),
    website: "https://www.2c2p.com",
    scriptSrc: ["\\.2c2p\\.com/"],
    xhr: ["\\.2c2p\\.com/"],
    dom: ["form[action*='2c2p.com']", "a[href*='2c2p.com']"]
  },

  "GBPrimePay": {
    cats: [41],
    description: "GBPrimePay is a Thai online payment gateway supporting PromptPay QR, credit cards, and mobile banking.",
    icon: makeBadgeSvg("#1D4ED8", "#FFF", "GB"),
    website: "https://www.gbprimepay.com",
    scriptSrc: ["api\\.gbprimepay\\.com"],
    dom: ["form[action*='gbprimepay.com']"]
  },

  "ChillPay": {
    cats: [41],
    description: "ChillPay is an online payment gateway in Thailand supporting QR PromptPay, internet banking, and cards.",
    icon: makeBadgeSvg("#0284C7", "#FFF", "CP"),
    website: "https://www.chillpay.co",
    scriptSrc: ["\\.chillpay\\.co/"],
    dom: ["form[action*='chillpay.co']"]
  },

  "Beam Checkout": {
    cats: [41],
    description: "Beam is a one-click checkout and payment gateway platform in Southeast Asia.",
    icon: makeBadgeSvg("#4F46E5", "#FFF", "Bm"),
    website: "https://www.beamcheckout.com",
    scriptSrc: ["\\.beamcheckout\\.com"],
    xhr: ["\\.beamcheckout\\.com"]
  },

  "Polar": {
    cats: [41],
    description: "Polar is a merchant of record and monetization platform built for open-source and SaaS developers.",
    icon: makeBadgeSvg("#0F172A", "#FFF", "Po"),
    website: "https://polar.sh",
    dom: ["a[href*='polar.sh/checkout']", "a[href*='buy.polar.sh']"],
    scriptSrc: ["cdn\\.polar\\.sh"]
  }
};

async function fetchRules() {
  await fs.mkdir('rules', { recursive: true });

  console.log('[StackLens] Fetching categories.json...');
  const catRes = await fetch(`${BASE_URL}/categories.json`);
  if (!catRes.ok) {
    throw new Error(`Failed to fetch categories.json: ${catRes.status}`);
  }
  const categories = await catRes.json();
  await fs.writeFile('rules/categories.json', JSON.stringify(categories, null, 2));

  const allTechnologies = {};
  for (const char of FILES) {
    console.log(`[StackLens] Fetching technologies/${char}.json...`);
    const res = await fetch(`${BASE_URL}/technologies/${char}.json`);
    if (res.ok) {
      const data = await res.json();
      Object.assign(allTechnologies, data);
    }
  }

  // Merge additional fingerprints from projectdiscovery/wappalyzergo
  try {
    console.log('[StackLens] Fetching additional fingerprints from projectdiscovery/wappalyzergo...');
    const pdRes = await fetch(PD_URL);
    if (pdRes.ok) {
      const pdData = await pdRes.json();
      if (pdData?.apps) {
        for (const [name, rule] of Object.entries(pdData.apps)) {
          const cleanName = name.trim();
          if (!allTechnologies[cleanName]) {
            allTechnologies[cleanName] = rule;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[StackLens] Optional projectdiscovery merge skipped:', err.message);
  }

  // Merge custom & enhanced 2026 technology rules
  for (const [techName, customRule] of Object.entries(CUSTOM_2026_TECHNOLOGIES)) {
    if (allTechnologies[techName]) {
      const existing = allTechnologies[techName];
      allTechnologies[techName] = {
        ...existing,
        ...customRule,
        cookies: { ...(existing.cookies || {}), ...(customRule.cookies || {}) },
        headers: { ...(existing.headers || {}), ...(customRule.headers || {}) },
        js: { ...(existing.js || {}), ...(customRule.js || {}) },
        css: [...new Set([...(Array.isArray(existing.css) ? existing.css : existing.css ? [existing.css] : []), ...(customRule.css || [])])],
        scriptSrc: [
          ...new Set([
            ...(Array.isArray(existing.scriptSrc) ? existing.scriptSrc : existing.scriptSrc ? [existing.scriptSrc] : []),
            ...(customRule.scriptSrc || [])
          ])
        ],
        scripts: [
          ...new Set([
            ...(Array.isArray(existing.scripts) ? existing.scripts : existing.scripts ? [existing.scripts] : []),
            ...(customRule.scripts || [])
          ])
        ],
        xhr: [
          ...new Set([
            ...(Array.isArray(existing.xhr) ? existing.xhr : existing.xhr ? [existing.xhr] : []),
            ...(customRule.xhr || [])
          ])
        ]
      };
    } else {
      allTechnologies[techName] = customRule;
    }
  }

  // Enrich Apereo CAS
  if (allTechnologies['Apereo CAS']) {
    allTechnologies['Apereo CAS'].cookies = {
      ...(allTechnologies['Apereo CAS'].cookies || {}),
      "CASTGC": "",
      "TGC": ""
    };
    allTechnologies['Apereo CAS'].url = ["/cas/login", "[?&]ticket=ST-"];
    allTechnologies['Apereo CAS'].dom = {
      ...(allTechnologies['Apereo CAS'].dom || {}),
      "a[href*='/cas/login']": { exists: "" },
      "form[action*='/cas/login']": { exists: "" }
    };
  }

  await fs.writeFile('rules/technologies.json', JSON.stringify(allTechnologies));
  console.log(`[StackLens] Done! Merged ${Object.keys(allTechnologies).length} technologies for 2026.`);
}

fetchRules().catch((err) => {
  console.error(err);
  process.exit(1);
});
