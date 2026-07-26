const CSRF_KEY = 'csrf_token';

function generateCsrfToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function getCsrfToken() {
    let token = sessionStorage.getItem(CSRF_KEY);
    if (!token || token.length !== 64) {
        token = generateCsrfToken();
        sessionStorage.setItem(CSRF_KEY, token);
    }
    return token;
}

export function verifyCsrfToken(token) {
    if (!token || typeof token !== 'string' || token.length !== 64) return false;
    return token === getCsrfToken();
}

export function clearCsrfToken() {
    sessionStorage.removeItem(CSRF_KEY);
}

export function sanitizeHtml(html) {
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
}

export function sanitizeAttribute(value) {
    if (typeof value !== 'string') return '';
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function validateOrigin(expectedOrigin) {
    try {
        const current = new URL(window.location.href);
        const expected = new URL(expectedOrigin || window.location.origin);
        return current.origin === expected.origin;
    } catch (error) {
        return false;
    }
}

export function setupNavigationGuard(allowedPaths) {
    const allowed = Array.isArray(allowedPaths) ? allowedPaths : [];

    function guard(event) {
        const href = event.target.getAttribute('href');
        if (!href) return;
        if (href.startsWith('http') && !href.startsWith(window.location.origin)) return;
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

        const isRelative = !href.startsWith('/');
        const targetOrigin = isRelative ? window.location.origin : new URL(href, window.location.origin).origin;
        if (targetOrigin !== window.location.origin) return;

        const path = new URL(href, window.location.origin).pathname;
        if (!allowed.some(allowedPath => path === allowedPath || path.startsWith(allowedPath))) {
            event.preventDefault();
            console.warn('Navigation guard blocked:', href);
        }
    }

    document.addEventListener('click', guard, true);
}

export function setupDoubleSubmitGuard(form, submitCallback) {
    if (!form) return submitCallback;
    let isSubmitting = false;

    form.addEventListener('submit', async (event) => {
        if (isSubmitting) {
            event.preventDefault();
            return;
        }
        isSubmitting = true;
        try {
            await submitCallback(event);
        } finally {
            setTimeout(() => {
                isSubmitting = false;
            }, 2000);
        }
    });
}

export function rateLimiter(key, maxAttempts = 5, windowMs = 60000) {
    const storageKey = `rate_limit_${key}`;
    const record = JSON.parse(sessionStorage.getItem(storageKey) || '{"count":0,"resetAt":0}');

    const now = Date.now();
    if (now > record.resetAt) {
        record.count = 0;
        record.resetAt = now + windowMs;
    }

    if (record.count >= maxAttempts) {
        const wait = Math.ceil((record.resetAt - now) / 1000);
        throw new Error(`محاولات كثيرة. يرجى المحاولة بعد ${wait} ثانية`);
    }

    record.count += 1;
    sessionStorage.setItem(storageKey, JSON.stringify(record));
    return true;
}

export function setupSecureAttribute(el, attributeName, allowedProtocols) {
    if (!el) return;
    const protocols = Array.isArray(allowedProtocols) ? allowedProtocols : ['https', 'http', 'mailto', 'tel'];
    const url = el.getAttribute(attributeName);
    if (!url) return;

    try {
        const parsed = new URL(url, window.location.href);
        if (!protocols.includes(parsed.protocol.replace(':', ''))) {
            el.removeAttribute(attributeName);
        }
    } catch (error) {
        el.removeAttribute(attributeName);
    }
}

export function disableDevToolsContextMenu() {
    document.addEventListener('contextmenu', (event) => {
        if (event.target.tagName === 'BODY' || event.target.id === 'admin-root') {
            event.preventDefault();
        }
    });
}

export function disableShortcuts() {
    document.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && ['u', 's', 'p', 'j', 'i'].includes(event.key.toLowerCase())) {
            event.preventDefault();
        }
        if (event.key === 'F12') {
            event.preventDefault();
        }
    });
}

export function setupSensitiveFormProtection(form) {
    if (!form) return;
    form.setAttribute('autocomplete', 'off');
    form.setAttribute('novalidate', 'novalidate');

    const sensitiveInputs = form.querySelectorAll('input[type="password"], input[name*="password"], input[name*="token"], input[name*="secret"]');
    sensitiveInputs.forEach(input => {
        input.setAttribute('autocomplete', 'new-password');
        input.addEventListener('copy', (e) => e.preventDefault());
        input.addEventListener('cut', (e) => e.preventDefault());
        input.addEventListener('paste', (e) => e.preventDefault());
    });
}