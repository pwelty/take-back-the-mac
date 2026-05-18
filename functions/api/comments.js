import { ensureCommentsSchema } from "../_shared/comments.js";
import { json, notifySubmission, rateLimit, readJsonBody } from "../_shared/security.js";

const RIGHTS = new Set([
  "real-uninstall",
  "app-footprint",
  "background-behavior",
  "clean-trials",
  "app-store-stewardship",
  "plain-permissions",
  "local-ownership",
  "refuse-cloud-gravity",
  "more-than-services",
  "inspect-and-reset"
]);

function getVoterId(request, body = {}) {
  const url = new URL(request.url);
  return body.voterId || request.headers.get("X-Voter-ID") || url.searchParams.get("voterId") || "";
}

function validVoterId(voterId) {
  return typeof voterId === "string" && /^[a-zA-Z0-9_-]{16,96}$/.test(voterId);
}

function cleanBody(value, maxLength) {
  return String(value || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function cleanLine(value, maxLength) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanEmail(value) {
  return cleanLine(value, 254).toLowerCase();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function findTarget(db, targetType, targetId) {
  if (targetType === "right") {
    return RIGHTS.has(targetId) ? { id: targetId, title: targetId } : null;
  }

  if (!/^[a-f0-9-]{36}$/i.test(targetId)) return null;

  return db.prepare("SELECT id, title FROM ideas WHERE id = ? AND status = 'Open'")
    .bind(targetId)
    .first();
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) {
    return json({ error: "Missing DB binding." }, 500);
  }

  const limited = await rateLimit(context, {
    bucket: "comment-submit",
    limit: 10,
    periodSeconds: 600
  });
  if (limited) return limited;

  const parsed = await readJsonBody(context.request, 4096);
  if (parsed.response) return parsed.response;
  const body = parsed.body;

  const voterId = getVoterId(context.request, body);
  if (!validVoterId(voterId)) {
    return json({ error: "Missing or invalid voter id." }, 400);
  }

  const targetType = body.targetType === "right" ? "right" : "idea";
  const targetId = String(body.targetId || "");
  const commentBody = cleanBody(body.body, 1200);
  const email = cleanEmail(body.email);

  if (commentBody.length < 3) {
    return json({ error: "Comment is too short." }, 400);
  }

  if (email && !validEmail(email)) {
    return json({ error: "Email is optional, but it needs to be valid if included." }, 400);
  }

  await ensureCommentsSchema(db);

  const target = await findTarget(db, targetType, targetId);
  if (!target) {
    return json({ error: "Request not found." }, 404);
  }

  const id = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO comments (id, target_type, target_id, body, author, email, status, voter_id)
    VALUES (?, ?, ?, ?, '', ?, 'Pending', ?)
  `).bind(id, targetType, targetId, commentBody, email, voterId).run();

  await notifySubmission(context, {
    id,
    subject: `New Take Back the Mac comment: ${target.title}`,
    fields: {
      Type: "Comment",
      Target: `${targetType}:${targetId}`,
      "Target title": target.title,
      Comment: commentBody,
      "Submitter email": email || "(not provided)",
      "Approve command": `UPDATE comments SET status = 'Open' WHERE id = '${id}';`,
      "Reject command": `UPDATE comments SET status = 'Rejected' WHERE id = '${id}';`
    }
  });

  return json({ ok: true, message: "Comment submitted for review." }, 201);
}
