const DEFAULT_RATE_LIMIT_SALT = "take-back-the-mac-rate-limit-v1";

export function json(body, status = 200, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");

  return Response.json(body, {
    status,
    headers
  });
}

export async function readJsonBody(request, maxBytes = 4096) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      response: json({ error: "Expected JSON body." }, 415)
    };
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > maxBytes) {
    return {
      response: json({ error: "Request body is too large." }, 413)
    };
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return {
      response: json({ error: "Request body is too large." }, 413)
    };
  }

  try {
    return { body: JSON.parse(text) };
  } catch {
    return {
      response: json({ error: "Expected JSON body." }, 400)
    };
  }
}

function clientIp(request) {
  const forwarded = request.headers.get("CF-Connecting-IP")
    || request.headers.get("True-Client-IP")
    || request.headers.get("X-Forwarded-For")
    || "";

  return forwarded.split(",")[0].trim() || "local";
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function ensureRateLimitSchema(db) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        bucket TEXT NOT NULL,
        window_start INTEGER NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        expires_at INTEGER NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits (expires_at)")
  ]);
}

export async function rateLimit(context, options) {
  const db = context.env.DB;
  if (!db) return null;

  const {
    bucket,
    limit,
    periodSeconds
  } = options;

  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / periodSeconds) * periodSeconds;
  const retryAfter = Math.max(1, windowStart + periodSeconds - now);
  const salt = context.env.RATE_LIMIT_SALT || DEFAULT_RATE_LIMIT_SALT;
  const key = await sha256Hex(`${salt}:${bucket}:${clientIp(context.request)}:${windowStart}`);

  await ensureRateLimitSchema(db);
  await db.prepare("DELETE FROM rate_limits WHERE expires_at < ?")
    .bind(now)
    .run();

  await db.prepare(`
    INSERT INTO rate_limits (key, bucket, window_start, count, expires_at, updated_at)
    VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key)
    DO UPDATE SET count = count + 1, updated_at = CURRENT_TIMESTAMP
  `).bind(key, bucket, windowStart, windowStart + (periodSeconds * 2)).run();

  const row = await db.prepare("SELECT count FROM rate_limits WHERE key = ?")
    .bind(key)
    .first();

  if (Number(row?.count || 0) > limit) {
    return json(
      { error: "Too many requests. Try again shortly." },
      429,
      { "Retry-After": String(retryAfter) }
    );
  }

  return null;
}

function submissionText(fields) {
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n\n");
}

export async function notifySubmission(context, options) {
  const apiKey = context.env.RESEND_API_KEY;
  const to = context.env.SUBMISSION_NOTIFY_TO;
  const from = context.env.SUBMISSION_NOTIFY_FROM;

  if (!apiKey || !to || !from) {
    return { sent: false, reason: "missing-email-config" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": options.id
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: options.subject,
      text: submissionText(options.fields)
    })
  });

  if (!response.ok) {
    console.error("Email notification failed", await response.text());
    return { sent: false, reason: "email-api-failed" };
  }

  return { sent: true };
}
