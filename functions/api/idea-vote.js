function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

function getVoterId(request, body = {}) {
  const url = new URL(request.url);
  return body.voterId || request.headers.get("X-Voter-ID") || url.searchParams.get("voterId") || "";
}

function validVoterId(voterId) {
  return typeof voterId === "string" && /^[a-zA-Z0-9_-]{16,96}$/.test(voterId);
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) {
    return json({ error: "Missing DB binding." }, 500);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Expected JSON body." }, 400);
  }

  const ideaId = String(body.ideaId || "");
  const value = Number(body.value);
  const voterId = getVoterId(context.request, body);

  if (!/^[a-f0-9-]{36}$/i.test(ideaId)) {
    return json({ error: "Missing or invalid request id." }, 400);
  }

  if (value !== 1) {
    return json({ error: "Vote must be 1." }, 400);
  }

  if (!validVoterId(voterId)) {
    return json({ error: "Missing or invalid voter id." }, 400);
  }

  const idea = await db.prepare("SELECT id FROM ideas WHERE id = ?")
    .bind(ideaId)
    .first();

  if (!idea) {
    return json({ error: "Request not found." }, 404);
  }

  const previous = await db.prepare(`
    SELECT value
    FROM idea_votes
    WHERE voter_id = ? AND idea_id = ?
  `).bind(voterId, ideaId).first();

  if (previous && Number(previous.value) === value) {
    await db.prepare(`
      DELETE FROM idea_votes
      WHERE voter_id = ? AND idea_id = ?
    `).bind(voterId, ideaId).run();
  } else {
    await db.prepare(`
      INSERT INTO idea_votes (voter_id, idea_id, value, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(voter_id, idea_id)
      DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).bind(voterId, ideaId, value).run();
  }

  return json({ ok: true });
}
