// Cloudflare Worker: serves the static landing page + a tiny waitlist API backed by D1.
//
//   POST /api/waitlist   -> stores {email} in the `signups` D1 table
//   GET  /admin          -> Basic-Auth protected list of signups (append ?format=csv to download)
//   everything else      -> static assets (index.html, favicon.svg, og-image.png, …)

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Create the table on first use so the waitlist works even before schema.sql is run.
let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS signups (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, source TEXT)"
  ).run();
  schemaReady = true;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/waitlist" && request.method === "POST") {
      return joinWaitlist(request, env);
    }
    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      return adminView(request, env, url);
    }
    // Fall through to the static assets (index.html, icons, og-image, …).
    return env.ASSETS.fetch(request);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function joinWaitlist(request, env) {
  let email = "";
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await request.json();
      email = String(body.email || "");
    } else {
      const form = await request.formData();
      email = String(form.get("email") || "");
    }
  } catch (_) {
    /* fall through to validation */
  }

  email = email.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: "invalid_email" }, 400);
  }

  try {
    await ensureSchema(env);
    await env.DB.prepare(
      "INSERT OR IGNORE INTO signups (email, created_at, source) VALUES (?1, ?2, ?3)"
    )
      .bind(email, new Date().toISOString(), "landing")
      .run();
  } catch (_) {
    return json({ ok: false, error: "server_error" }, 500);
  }
  return json({ ok: true });
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function requireAuth() {
  return new Response("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="ChaosCtrl waitlist", charset="UTF-8"' },
  });
}

async function adminView(request, env, url) {
  const secret = env.WAITLIST_ADMIN_KEY;
  if (!secret) {
    return new Response(
      "WAITLIST_ADMIN_KEY is not set. Add it as a secret on this Worker to use /admin.",
      { status: 500 }
    );
  }
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return requireAuth();
  let password = "";
  try {
    password = atob(header.slice(6)).split(":").slice(1).join(":");
  } catch (_) {
    return requireAuth();
  }
  if (!timingSafeEqual(password, secret)) return requireAuth();

  await ensureSchema(env);
  const { results } = await env.DB.prepare(
    "SELECT email, created_at, source FROM signups ORDER BY datetime(created_at) DESC"
  ).all();
  const rows = results || [];

  if (url.searchParams.get("format") === "csv") {
    const csv =
      "email,created_at,source\n" +
      rows.map((r) => [r.email, r.created_at, r.source || ""].map(csvCell).join(",")).join("\n");
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="chaosctrl-waitlist.csv"',
      },
    });
  }
  return new Response(renderAdmin(rows), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function csvCell(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

function renderAdmin(rows) {
  const trs = rows
    .map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.email)}</td><td>${esc(r.created_at)}</td></tr>`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ChaosCtrl waitlist (${rows.length})</title>
<style>
  body{font-family:-apple-system,system-ui,sans-serif;background:#EAECF6;color:#0E1220;margin:0;padding:32px}
  .wrap{max-width:720px;margin:0 auto}
  h1{font-size:24px;margin:0 0 4px}
  .sub{color:#5A607A;font-size:14px;margin:0 0 20px}
  a{color:#4E63E8}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px -18px rgba(30,40,90,.4)}
  th,td{text-align:left;padding:11px 14px;font-size:14px;border-bottom:1px solid #eef0f6}
  th{background:#f4f5fb;color:#5A607A;font-weight:600}
  td:first-child{color:#9096b0;width:40px}
  .empty{color:#8A90AA;padding:40px;text-align:center;background:#fff;border-radius:14px}
</style></head><body><div class="wrap">
<h1>ChaosCtrl waitlist</h1>
<p class="sub">${rows.length} signup${rows.length === 1 ? "" : "s"} &middot; <a href="/admin?format=csv">Download CSV</a></p>
${
    rows.length
      ? `<table><thead><tr><th>#</th><th>Email</th><th>Joined</th></tr></thead><tbody>${trs}</tbody></table>`
      : `<div class="empty">No signups yet.</div>`
  }
</div></body></html>`;
}
