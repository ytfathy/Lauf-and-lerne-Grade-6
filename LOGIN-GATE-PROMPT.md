# Login gate prompt (Google + Supabase "Licenses" table) — reusable for any of my websites

Copy everything below the line into the AI coding assistant, inside the project folder of the website you want to protect.
Fill in the 3 values in **Details for this program** first.

---

You are adding a paid-customer login gate to this website. This exact setup is already working on another of my sites (Math-G6). Follow it closely: the code below is proven, and the "Mistakes that already happened" list is real problems we hit. Do not repeat them.

## Details for this program (I fill these in)
- Program code: `[PUT-CODE-HERE]` (example: `Math-G6`). It must match the `program_code` I write in the Supabase table, letter for letter (the code ignores case and spaces, but keep them the same anyway).
- Live URL: `[https://PUT-SITE.vercel.app]`
- WhatsApp number for the "not subscribed" page: `+201002152024` (already in the code as `201002152024`).

## Fixed facts about my setup (do not ask me again, do not change)
- All my programs share ONE Supabase project: `https://jrxbpzdmoiaudposwwse.supabase.co`.
- The customer table is `public."Licenses"` — capital **L**. Postgres names are case-sensitive: `licenses` does NOT exist and causes the "temporary error" page. Columns: `email` (text), `program_code` (text), `ID`.
- RLS is ON and the policy that lets a signed-in user read only their own rows already exists (SQL is at the end, only for reference/repair).
- Google sign-in is enabled in Supabase and published in Google Cloud.
- The Supabase **Site URL** is another program (`https://german-grade-6-stories.vercel.app`). If this site's callback address is not in the Redirect URLs list, Supabase silently sends the user to THAT site, and the user sees "sign in" again. The code below handles a returned `?code=` on any page, but the real fix is the Redirect URL entry (see my steps).
- Use ONLY the Supabase URL and the publishable/anon key. Never use or ask for the service_role key.
- Your shell probably has no GitHub login. If `git push` asks for a username, stop and tell me to push myself. Never type credentials.

## What to build
1. Look at the project first and tell me how it is built (plain HTML, React/Vite, Next.js, …). Do NOT rewrite or break the existing program.
2. The check must run on the SERVER before any page or file is sent. Every page and asset is protected except the login routes (`/login`, `/auth/login`, `/auth/callback`, `/auth/logout`). Hiding things in the browser is not enough.
3. Flow:
   - Not signed in → simple "Sign in with Google" page (Arabic RTL first, English under it).
   - Signed in but email not in `Licenses` for this program code → "You're not subscribed" page with the user's email, a WhatsApp button to my number with a ready message (program code + email), and "Sign in with a different account" (`/auth/logout?switch=1`, which signs out and opens Google's account picker).
   - Signed in and on the list → program opens normally.
   - A small logout button (link to `/auth/logout`) placed in the program's existing header/top bar, styled like the other buttons there, with `text-decoration:none` so it has no underline.
4. Emails and program codes compared lowercase + trimmed. Only Google accounts accepted.
5. Program code read from env var `PROGRAM_CODE` so the same files work for every program.
6. Fail closed: missing env var, database error, or anything unexpected must NEVER open the program. Error pages must show the real error message in small text (this saved us hours last time).
7. No device limit (later).

## Which approach
- **Static site (plain HTML/JS, or a Vite/React build that Vercel serves as static files):** use Vercel Routing Middleware — a `middleware.js` file at the project root, exactly as below. It runs before Vercel serves any file. Keep the project's existing build settings; only add the dependencies to its `package.json` (create one if there is none).
- **Next.js:** put the same logic in Next.js `middleware.ts` using `NextResponse` instead of `@vercel/functions` `next()`, same routes, same rules, same pages.
- Before adding the `?code=` handling, grep the project for its own use of a `code` query parameter. If the program already uses `?code=`, only accept it on `/auth/callback`.
- The files use `import`/`export`. Vercel only picks up a root file named `middleware.js` or `middleware.ts`. If the project has no `package.json` or adding `"type": "module"` doesn't break its build, use the files as they are. If adding it WOULD break the build, rename `middleware.js` → `middleware.ts` and `auth-pages.js` → `auth-pages.ts` (update the import), and run the test with a TypeScript-capable runner or rename it to `gate.test.mjs`.

## Proven code (copy these files; adjust only what the project needs)

### package.json (add these dependencies and the test script; keep everything already there)
```json
{
  "name": "math-grade-6-final",
  "private": true,
  "type": "module",
  "dependencies": {
    "@supabase/ssr": "0.12.7",
    "@supabase/supabase-js": "2.119.2",
    "@vercel/functions": "3.11.3"
  },
  "scripts": {
    "test": "node --test test/"
  }
}
```
Also add `node_modules` to `.gitignore`. Commit `package-lock.json`.

### middleware.js
```js
/* Login gate (Vercel Routing Middleware). Runs on Vercel's servers before ANY page or file is sent.
   Only people signed in with Google whose email is in the Supabase `Licenses` table (capital L) for PROGRAM_CODE get through.
   Env vars: SUPABASE_URL, SUPABASE_ANON_KEY (publishable/anon key only — never service_role), PROGRAM_CODE. */
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import { next } from '@vercel/functions';
import { loginPage, notSubscribedPage, messagePage } from './auth-pages.js';

const env = k => (process.env[k] || '').trim();
export const norm = s => String(s ?? '').trim().toLowerCase();

// shortcut: approved users are remembered per server instance for 5 min, so removing a customer takes up to 5 min; set to 0 for instant.
const APPROVED_TTL_MS = 5 * 60 * 1000;
const approved = new Map();
const lookups = new Map(); // one license query at a time per user, shared by the ~30 parallel file requests of a page load

// A slow or stuck Supabase should show our error page quickly instead of hanging the browser.
const SUPABASE_TIMEOUT_MS = 8000;
const fetchWithTimeout = (input, init = {}) => {
  const t = AbortSignal.timeout(SUPABASE_TIMEOUT_MS);
  return fetch(input, { ...init, signal: init.signal && AbortSignal.any ? AbortSignal.any([init.signal, t]) : init.signal || t });
};

/** True when one of the user's license rows matches their email and this program (case and spaces ignored). */
export const matchesLicense = (rows, email, code) =>
  !!email && (rows || []).some(r => norm(r.email) === norm(email) && norm(r.program_code) === norm(code));

export default async function middleware(request) {
  const url = new URL(request.url), path = url.pathname;
  const out = new Headers();
  const KEY = env('SUPABASE_ANON_KEY'), CODE = env('PROGRAM_CODE');
  // Keep only https://xxxx.supabase.co even if a longer URL (e.g. .../rest/v1/) was pasted.
  let SUPABASE_URL = '';
  try { SUPABASE_URL = new URL(env('SUPABASE_URL')).origin; } catch { /* invalid URL: fail closed below */ }
  // Fail closed: a missing setting must never open the program.
  if (!SUPABASE_URL || !KEY || !CODE) return html(500, messagePage('الموقع غير مُعدّ بعد', 'Site is not configured yet (missing environment variables).'), out);

  const supabase = createServerClient(SUPABASE_URL, KEY, {
    global: { fetch: fetchWithTimeout },
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get('cookie') ?? ''),
      setAll: (list, headers) => {
        list.forEach(({ name, value, options }) => out.append('Set-Cookie', serializeCookieHeader(name, value, options)));
        Object.entries(headers || {}).forEach(([k, v]) => out.set(k, v));
      },
    },
  });

  if (path === '/auth/login') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${url.origin}/auth/callback`, queryParams: { prompt: 'select_account' } },
    });
    return error || !data?.url ? fail(url, error?.message, out) : redirect(url, data.url, out);
  }
  // Supabase sends people back to /auth/callback, or to the Site URL (any page) when that address isn't allow-listed.
  if (path === '/auth/callback' || url.searchParams.has('code')) {
    const code = url.searchParams.get('code');
    if (!code) return fail(url, url.searchParams.get('error_description') || url.searchParams.get('error'), out);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? fail(url, error.message, out) : redirect(url, '/', out);
  }
  if (path === '/auth/logout') {
    await supabase.auth.signOut();
    return redirect(url, url.searchParams.has('switch') ? '/auth/login' : '/login', out);
  }

  // Verifies the session token's signature (and refreshes it when it is about to expire).
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const meta = claims?.app_metadata || {};
  const viaGoogle = (meta.providers || [meta.provider]).includes('google');
  const signedIn = !!claims && viaGoogle;

  if (path === '/login') return signedIn ? redirect(url, '/', out) : html(200, loginPage(url.searchParams.get('error')), out);
  if (!signedIn) return redirect(url, '/login', out);

  const email = norm(claims.email), key = `${claims.sub}|${norm(CODE)}`;
  if ((approved.get(key) || 0) < Date.now()) {
    // RLS lets a user read only their own rows, so this returns at most this user's licenses.
    if (!lookups.has(key)) lookups.set(key, Promise.resolve(supabase.from('Licenses').select('email, program_code').abortSignal(AbortSignal.timeout(SUPABASE_TIMEOUT_MS))).finally(() => lookups.delete(key)));
    const { data: rows, error } = await lookups.get(key);
    if (error) return html(503, messagePage('حدث خطأ مؤقت، حاول مرة أخرى بعد قليل.', 'Temporary error, please try again shortly.', [error.code, error.message].filter(Boolean).join(' — ')), out);
    if (!matchesLicense(rows, email, CODE)) return html(403, notSubscribedPage(email, CODE), out);
    approved.set(key, Date.now() + APPROVED_TTL_MS);
  }
  // Let the browser keep program files and re-check them cheaply (304) instead of re-downloading everything each visit.
  // `private` keeps shared caches out; when auth cookies were just set, Supabase's own no-store headers are already in `out`.
  if (!out.has('Cache-Control')) out.set('Cache-Control', 'private, no-cache');
  return next({ headers: out });
}

function redirect(url, to, headers) {
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Location', new URL(to, url).toString());
  return new Response(null, { status: 302, headers });
}
const fail = (url, reason, headers) => redirect(url, '/login?error=' + encodeURIComponent(String(reason || 'unknown').slice(0, 200)), headers);
function html(status, body, headers) {
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(body, { status, headers });
}
```

### auth-pages.js
```js
/* HTML for the login-gate pages (Arabic first, right-to-left, with English underneath). Used by middleware.js. */
const WHATSAPP = '201002152024'; // +20 100 215 2024, digits only for wa.me

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const shell = (title, body) => `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${title}</title>
<style>
:root{--bg:#f4f2fb;--card:#fff;--ink:#1d1b3a;--muted:#6b6890;--brand:#5b3fd6;--line:#e6e2f5}
@media (prefers-color-scheme:dark){:root{--bg:#14131f;--card:#1f1d2e;--ink:#f1effa;--muted:#a7a3c4;--brand:#8f7bff;--line:#2e2b44}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;background:var(--bg);color:var(--ink);
  font:16px/1.6 "Segoe UI",Tahoma,"Noto Sans Arabic",Arial,sans-serif}
.card{width:100%;max-width:420px;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:32px 24px;text-align:center;box-shadow:0 10px 30px rgba(40,20,120,.08)}
.ic{font-size:44px;line-height:1}
h1{font-size:22px;margin:12px 0 4px}
p{margin:0 0 6px;color:var(--muted)}
.en{direction:ltr;font-size:14px}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:48px;margin-top:14px;padding:10px 16px;border-radius:12px;
  font-weight:600;font-size:16px;font-family:inherit;text-decoration:none;border:1px solid var(--line);color:var(--ink);background:var(--card)}
.btn:focus-visible{outline:3px solid var(--brand);outline-offset:2px}
.btn.main{background:var(--brand);border-color:var(--brand);color:#fff}
.btn.wa{background:#1fa855;border-color:#1fa855;color:#fff}
.btn small{font-weight:400;opacity:.85}
.who{direction:ltr;display:inline-block;margin:10px 0 4px;padding:4px 12px;border-radius:999px;background:var(--bg);font-size:14px;word-break:break-all}
.err{color:#c0392b}
</style></head><body><main class="card">${body}</main></body></html>`;

const G = '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z"/></svg>';

export const loginPage = reason => shell('تسجيل الدخول | Sign in', `
  <div class="ic" aria-hidden="true">🔒</div>
  <h1>تسجيل الدخول</h1>
  <p>سجّل الدخول بحساب Gmail المُسجَّل في اشتراكك.</p>
  <p class="en">Sign in with the Gmail account on your subscription.</p>
  ${reason ? `<p class="err" role="alert">تعذّر تسجيل الدخول، حاول مرة أخرى. <span class="en">Sign-in failed, please try again.</span><br><small class="en">${esc(reason)}</small></p>` : ''}
  <a class="btn main" href="/auth/login">${G}<span>الدخول بحساب Google <small>· Sign in with Google</small></span></a>`);

export const notSubscribedPage = (email, code) => {
  const msg = `مرحبًا، أريد الاشتراك في البرنامج ${code}\nHello, I'd like to subscribe to ${code}\nEmail: ${email}`;
  return shell('غير مشترك | Not subscribed', `
  <div class="ic" aria-hidden="true">✋</div>
  <h1>أنت غير مشترك في هذا البرنامج</h1>
  <p class="en">You're not subscribed to this program.</p>
  <span class="who">${esc(email)}</span>
  <p>للاشتراك تواصل معنا على واتساب، أو سجّل الدخول بحساب آخر.</p>
  <a class="btn wa" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">💬 <span>تواصل عبر واتساب <small>· WhatsApp us</small></span></a>
  <a class="btn" href="/auth/logout?switch=1">🔄 <span>الدخول بحساب آخر <small>· Use a different account</small></span></a>`);
};

export const messagePage = (ar, en, detail) => shell('تنبيه | Notice', `
  <div class="ic" aria-hidden="true">⚠️</div><h1>${esc(ar)}</h1><p class="en">${esc(en)}</p>
  ${detail ? `<p class="en"><small>${esc(detail)}</small></p>` : ''}
  <a class="btn" href="/">إعادة المحاولة <small>· Try again</small></a>`);
```

### test/gate.test.js (runs the real middleware against a fake Supabase; `npm test` must pass)
```js
// Runs the real middleware against a fake Supabase server. Run with: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = claims => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, ...claims })}.sig`;
const USERS = {
  paid: { sub: 'u1', email: 'malek@gmail.com', app_metadata: { provider: 'google', providers: ['google'] } },
  other: { sub: 'u2', email: 'stranger@gmail.com', app_metadata: { provider: 'google', providers: ['google'] } },
  wrongProgram: { sub: 'u3', email: 'sara@gmail.com', app_metadata: { provider: 'google', providers: ['google'] } },
  password: { sub: 'u4', email: 'malek@gmail.com', app_metadata: { provider: 'email', providers: ['email'] } },
};
// Rows as stored in the table (messy casing/spaces on purpose), returned per user like RLS would.
const LICENSES = [{ email: '  Malek@Gmail.COM ', program_code: ' Math-G6' }, { email: 'sara@gmail.com', program_code: 'Science-G6' }];
let restFails = false, restHangs = false, restCalls = 0;

const tokenUser = auth => {
  const part = (auth || '').split('.')[1];
  if (!part) return null;
  const { sub } = JSON.parse(Buffer.from(part, 'base64url'));
  return Object.values(USERS).find(u => u.sub === sub);
};
const server = http.createServer((req, res) => {
  const u = tokenUser(req.headers.authorization);
  const send = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (req.url.startsWith('/auth/v1/user')) return u ? send(200, { id: u.sub, email: u.email, aud: 'authenticated' }) : send(401, { msg: 'bad jwt' });
  if (req.url.startsWith('/auth/v1/logout')) { res.writeHead(204); return res.end(); }
  if (req.url.startsWith('/auth/v1/token')) {
    let body = ''; req.on('data', d => body += d);
    return req.on('end', () => JSON.parse(body).auth_code === 'good-code'
      ? send(200, { access_token: jwt(USERS.paid), refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u1', email: USERS.paid.email } })
      : send(400, { error: 'invalid_grant', error_description: 'Invalid code' }));
  }
  if (req.url.startsWith('/rest/v1/Licenses')) {
    restCalls++;
    if (restHangs) return; // never answers
    if (restFails) return send(500, { message: 'boom' });
    return send(200, u ? LICENSES.filter(r => r.email.trim().toLowerCase() === u.email) : []);
  }
  send(404, {});
});

let mw, base;
before(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://localhost:${server.address().port}`;
  Object.assign(process.env, { SUPABASE_URL: base, SUPABASE_ANON_KEY: 'anon-test', PROGRAM_CODE: 'math-g6 ' });
  mw = (await import('../middleware.js')).default;
});
after(() => server.close());

const cookieFor = u => `sb-localhost-auth-token=base64-${b64({ access_token: jwt(u), refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: u.sub, email: u.email } })}`;
const get = (path, u) => mw(new Request('https://mathgrade6final.vercel.app' + path, { headers: u ? { cookie: cookieFor(u) } : {} }));

test('not signed in: every page and file redirects to /login', async () => {
  for (const p of ['/', '/index.html', '/assets/logo.png', '/data/q2_m4.js', '/middleware.js']) {
    const r = await get(p);
    assert.equal(r.status, 302, p);
    assert.equal(r.headers.get('location'), 'https://mathgrade6final.vercel.app/login', p);
  }
});

test('/login shows the Arabic Google sign-in page', async () => {
  const r = await get('/login'), body = await r.text();
  assert.equal(r.status, 200);
  assert.match(body, /dir="rtl"/);
  assert.match(body, /href="\/auth\/login"/);
});

test('/auth/login sends the user to Google via Supabase with a PKCE cookie', async () => {
  const r = await get('/auth/login'), loc = new URL(r.headers.get('location'));
  assert.equal(r.status, 302);
  assert.equal(loc.origin + loc.pathname, base + '/auth/v1/authorize');
  assert.equal(loc.searchParams.get('provider'), 'google');
  assert.equal(loc.searchParams.get('redirect_to'), 'https://mathgrade6final.vercel.app/auth/callback');
  assert.match(r.headers.get('set-cookie') || '', /code-verifier/);
});

test('a SUPABASE_URL pasted with /rest/v1/ still signs in at the project root', async () => {
  const keep = process.env.SUPABASE_URL;
  process.env.SUPABASE_URL = base + '/rest/v1/';
  try {
    const loc = new URL((await get('/auth/login')).headers.get('location'));
    assert.equal(loc.origin + loc.pathname, base + '/auth/v1/authorize');
  } finally { process.env.SUPABASE_URL = keep; }
});

test('Google sign-in code is accepted at /auth/callback or any page (Site URL fallback)', async () => {
  const login = await get('/auth/login');
  const verifier = login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  for (const p of ['/auth/callback?code=good-code', '/?code=good-code']) {
    const r = await mw(new Request('https://mathgrade6final.vercel.app' + p, { headers: { cookie: verifier } }));
    assert.equal(r.headers.get('location'), 'https://mathgrade6final.vercel.app/', p);
    assert.match(r.headers.getSetCookie().join('\n'), /sb-localhost-auth-token=base64-/, p);
  }
});

test('a failed sign-in shows the reason on the login page', async () => {
  const r = await get('/auth/callback?error=access_denied&error_description=Redirect%20not%20allowed');
  assert.equal(r.headers.get('location'), 'https://mathgrade6final.vercel.app/login?error=Redirect%20not%20allowed');
  const page = await (await get('/login?error=Redirect%20not%20allowed')).text();
  assert.match(page, /Redirect not allowed/);
  const bad = await get('/?code=bad-code');
  assert.match(bad.headers.get('location'), /\/login\?error=/);
});

test('licensed user gets through (email/code compared ignoring case and spaces)', async () => {
  const r = await get('/assets/logo.png', USERS.paid);
  assert.equal(r.headers.get('x-middleware-next'), '1');
  assert.equal(r.headers.get('cache-control'), 'private, no-cache'); // browser may keep files and revalidate
});

test('signed-in user not on the list sees the not-subscribed page', async () => {
  for (const u of [USERS.other, USERS.wrongProgram]) {
    const r = await get('/', u), body = await r.text();
    assert.equal(r.status, 403, u.email);
    assert.match(body, /wa\.me\/201002152024/);
    assert.match(body, /\/auth\/logout\?switch=1/);
    assert.ok(body.includes(u.email));
  }
});

test('a non-Google account with a listed email is not let in', async () => {
  const r = await get('/', USERS.password);
  assert.equal(r.status, 302);
});

test('/auth/logout clears the session and returns to /login', async () => {
  const r = await get('/auth/logout', USERS.paid);
  assert.equal(r.headers.get('location'), 'https://mathgrade6final.vercel.app/login');
  assert.match(r.headers.get('set-cookie') || '', /sb-localhost-auth-token=;/);
  const s = await get('/auth/logout?switch=1', USERS.paid);
  assert.equal(s.headers.get('location'), 'https://mathgrade6final.vercel.app/auth/login');
});

test('a page load of 30 parallel files makes one license query, not 30', async () => {
  restCalls = 0;
  const u = { sub: 'u9', email: 'malek@gmail.com', app_metadata: { providers: ['google'] } };
  USERS.burst = u;
  const rs = await Promise.all(Array.from({ length: 30 }, (_, i) => get('/f' + i + '.js', u)));
  assert.ok(rs.every(r => r.headers.get('x-middleware-next') === '1'));
  assert.equal(restCalls, 1);
});

test('a stuck Supabase shows the error page after the timeout instead of hanging', { timeout: 15000 }, async () => {
  restHangs = true;
  try {
    const t = Date.now(), r = await get('/', USERS.wrongProgram);
    assert.equal(r.status, 503);
    assert.ok(Date.now() - t < 10000);
  } finally { restHangs = false; }
});

test('database error fails closed', async () => {
  restFails = true;
  try {
    const r = await get('/', USERS.other);
    assert.equal(r.status, 503);
    assert.match(await r.text(), /boom/);
  } finally { restFails = false; }
});

test('missing settings fail closed', async () => {
  const keep = process.env.PROGRAM_CODE;
  process.env.PROGRAM_CODE = '';
  try { assert.equal((await get('/')).status, 500); } finally { process.env.PROGRAM_CODE = keep; }
});
```
If the site's domain is not `mathgrade6final.vercel.app`, change it in the test's request URLs; the tests themselves don't depend on it.

## Mistakes that already happened — check each one
1. **Gate committed to a side branch, but Vercel deploys `main`** → the site opened with no login, and `/login` was 404. Commit on the branch Vercel deploys for Production (usually `main`), or tell me clearly that I must merge it.
2. **`SUPABASE_URL` pasted with `/rest/v1/` at the end** → "No API key found in request". The code now keeps only the origin, but tell me to paste only `https://jrxbpzdmoiaudposwwse.supabase.co`.
3. **Redirect URL added as `https://site.vercel.app/` (exact)** → Supabase rejected `/auth/callback` and sent the user to the German site → endless "sign in". It must be `https://site.vercel.app/**`.
4. **Table name `licenses` instead of `"Licenses"`** → "temporary error" page after choosing the Google account.
5. **Env vars added after the deploy** → they only apply after a Redeploy.
6. **Generic error pages** hid the real cause. Always show the error message small on the page.
7. **Vercel preview URLs** (branch deployments) are not in Supabase Redirect URLs, so sign-in only works on the Production URL. Test there.
8. **`git push` waiting for a username** in a shell with no GitHub login. Don't hang on it; tell me to push.
9. **Every program file was sent with `Cache-Control: private, no-store`**, so browsers re-downloaded the whole site (~7 MB) on every visit. Passed-through files must get `private, no-cache` (cached, revalidated with 304); only the login/error pages and redirects get `no-store`.
10. **A stuck Supabase made new devices hang ~40 s**: the database client retries timed-out requests 3 times unless the timeout signal is attached to the query itself (`.abortSignal(AbortSignal.timeout(8000))`). Keep that, and keep the one-license-query-per-user de-duplication (a page load fires ~30 file requests at once).
11. **The Supabase project itself can stop answering for a few minutes** (we saw timeouts and "Project not specified" while status.supabase.com said all OK). Already signed-in devices keep working; new sign-ins fail until it recovers. That is not a code bug — if I report "works on my device, not on new ones", first time `https://jrxbpzdmoiaudposwwse.supabase.co/auth/v1/health` (401 in well under a second = healthy).

## Verify before you say "done"
- `npm test` passes.
- Load the program locally the way it normally runs and confirm it still works and the logout button shows with no underline (the middleware does not run locally; that's expected).
- After I push and Vercel deploys, check with curl:
  - `curl -sI <LIVE_URL>/` → `302` to `/login`
  - `curl -sI <LIVE_URL>/login` → `200`
  - `curl -sI <LIVE_URL>/auth/login` → `302` to `https://jrxbpzdmoiaudposwwse.supabase.co/auth/v1/authorize?provider=google&redirect_to=<LIVE_URL>/auth/callback...` (if you see `/rest/v1/` in it, the env var is wrong)
  - some real asset path (an image or JS file) → `302` to `/login`
- Be honest about what you tested and what you could not (you cannot test the real Google sign-in).

## When you finish, tell me in simple words (in the language I write to you), as a numbered checklist:

**Supabase** (dashboard → project `jrxbpzdmoiaudposwwse`):
1. Authentication → URL Configuration → Redirect URLs → Add URL: `<LIVE_URL>/**` (with `/**`). Do not change the Site URL.
2. Table Editor → `Licenses` → add a row for each customer: `email` = their Gmail, `program_code` = `<PROGRAM CODE>` (same spelling as in Vercel).
3. Only if the table/policy was ever recreated: run the SQL below.

**Vercel** (this project → Settings → Environment Variables, Production):
| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://jrxbpzdmoiaudposwwse.supabase.co` (nothing after `.co`) |
| `SUPABASE_ANON_KEY` | the publishable key (`sb_publishable_…`) or legacy anon key from Supabase → Project Settings → API Keys — same key as my other programs |
| `PROGRAM_CODE` | `<PROGRAM CODE>` |

Then: push to the Production branch (give me the exact `git push` command), and if the env vars were added after the last deploy, Deployments → ⋯ → Redeploy.

**Test:** in a private window, my listed Gmail gets in; a Gmail not listed for this program sees "not subscribed"; signed out, opening an asset URL directly sends me to the sign-in page.

## SQL (reference — already applied to the shared table; safe to re-run)
```sql
alter table public."Licenses" enable row level security;
grant select on public."Licenses" to authenticated;

drop policy if exists "Users read their own licenses" on public."Licenses";
create policy "Users read their own licenses"
on public."Licenses"
for select
to authenticated
using ( lower(trim(email)) = lower(trim(auth.jwt() ->> 'email')) );
```
