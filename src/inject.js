// src/inject.js
(function () {
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.type !== 'STACKLENS_CHECK_JS') return;

    const paths = event.data.paths || [];
    const detectedGlobals = {};

    for (const path of paths) {
      try {
        const value = path.split('.').reduce(
          (obj, key) => (obj !== undefined && obj !== null ? obj[key] : undefined),
          window
        );
        if (value !== undefined) {
          detectedGlobals[path] =
            typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
              ? String(value)
              : 'true';
        }
      } catch (err) {
        // ข้ามกรณีติด CORS หรือ Security Error บน Property บางตัว
      }
    }

    // ตรวจสอบ React 18/19 Fiber Root, Next.js App Router (self.__next_f), และ Vue 3 Root บน DOM
    try {
      if (Array.isArray(window.__next_f) && window.__next_f.length > 0) {
        detectedGlobals['__NEXT_F__'] = 'true';
      }
      const candidates = [
        document.getElementById('__next'),
        document.getElementById('root'),
        document.getElementById('app'),
        document.body?.firstElementChild
      ].filter(Boolean);

      for (const el of candidates) {
        const keys = Object.keys(el);
        if (keys.some((k) => k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$'))) {
          detectedGlobals['__REACT_FIBER_ROOT__'] = 'true';
        }
        if ('__vue_app__' in el || '__vue__' in el) {
          detectedGlobals['__VUE_ROOT__'] = 'true';
        }
      }
    } catch {}

    window.postMessage({ type: 'STACKLENS_GLOBALS_RESULT', globals: detectedGlobals }, '*');
  });
})();
