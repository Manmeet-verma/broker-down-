const ENV_API = process.env.NEXT_PUBLIC_API_URL;
const LOCAL_API = 'http://localhost:4000/api';
const PROD_APIS = [
  'https://palevioletred-horse-466851.hostingersite.com/api',
  'https://broker-down.vercel.app/api'
];

function normalize(url) {
  const trimmed = String(url).trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(trimmed)) return trimmed;
  return trimmed.replace(/^http:\/\//, 'https://');
}

function runningLocally() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return !host || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
}

// Every base URL the client is allowed to use, in priority order. The first
// entry is the configured one; the rest are used when the active one is
// unreachable or not configured, so a missing NEXT_PUBLIC_API_URL at build
// time can never fall back to localhost in a deployed build.
function buildCandidates() {
  const out = [];
  const add = (u) => {
    const n = normalize(u);
    if (n && !out.includes(n)) out.push(n);
  };
  if (runningLocally()) {
    add(ENV_API);
    add(LOCAL_API);
  } else {
    add(ENV_API);
    PROD_APIS.forEach(add);
  }
  return out;
}

let candidates = null;
let activeIndex = 0;

const bases = () => (candidates ||= buildCandidates());
const currentBase = () => bases()[activeIndex];

function advanceBase() {
  if (activeIndex < bases().length - 1) {
    activeIndex += 1;
    return true;
  }
  return false;
}

let token = null;
export const setApiToken = (t) => (token = t);

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function isNetworkError(err) {
  return err instanceof TypeError || err?.name === 'TypeError' || err?.name === 'FetchError';
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const all = bases();
  let lastError = null;

  for (let attempt = 0; attempt < all.length; attempt++) {
    const base = currentBase();
    let res;

    try {
      res = await fetch(`${base}${path}`, { ...options, headers, credentials: 'include' });
    } catch (err) {
      // The host never answered (DNS/refused/blocked) — try the next backend.
      lastError = new ApiError(0, `Cannot reach the API at ${base}. (${err.message})`);
      if (advanceBase()) continue;
      throw lastError;
    }

    // 503 = backend up but not configured (e.g. missing service account) —
    // only fail over if another known backend is available, otherwise surface it.
    if (res.status === 503 && advanceBase()) continue;

    if (res.status === 401) {
      const evt = new CustomEvent('api:unauthorized');
      window.dispatchEvent(evt);
      throw new ApiError(401, 'Session expired. Please login again.');
    }

    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      throw new ApiError(res.status, typeof data === 'string' ? data : data?.error || 'Request failed');
    }
    return data;
  }

  throw lastError || new ApiError(0, 'API unreachable');
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),
  upload: (p, formData) => request(p, { method: 'POST', body: formData })
};

/** Fetch a file with the auth token and trigger a browser download. */
export async function downloadFile(path, fallbackName = 'file') {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const all = bases();
  let lastError = null;
  let res = null;

  for (let attempt = 0; attempt < all.length; attempt++) {
    try {
      res = await fetch(`${currentBase()}${path}`, { headers, credentials: 'include' });
    } catch (err) {
      lastError = new ApiError(0, `Cannot reach the API. (${err.message})`);
      if (advanceBase()) continue;
      throw lastError;
    }
    if (res.status === 503 && advanceBase()) continue;
    break;
  }

  if (!res?.ok) {
    const data = await res?.json().catch(() => ({}));
    throw new ApiError(res?.status || 0, data?.error || 'Download failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
