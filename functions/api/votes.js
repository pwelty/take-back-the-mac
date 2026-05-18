const RIGHTS = [
  "real-uninstall",
  "app-footprint",
  "background-behavior",
  "clean-trials",
  "app-store-stewardship",
  "plain-permissions",
  "local-ownership",
  "refuse-cloud-gravity",
  "more-than-services",
  "inspect-and-reset",
  "treated-as-owner"
];

const RIGHT_SET = new Set(RIGHTS);

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

async function ensureSchema(db) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS ballots (
        voter_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        value INTEGER NOT NULL CHECK (value = 1),
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (voter_id, item_id)
      )
    `),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_ballots_item_id ON ballots (item_id)")
  ]);
}

async function snapshot(db, voterId = "") {
  const countsResult = await db.prepare(`
    SELECT
      item_id,
      SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END) AS up
    FROM ballots
    GROUP BY item_id
  `).all();

  const counts = new Map();
  for (const row of countsResult.results || []) {
    counts.set(row.item_id, {
      up: Number(row.up || 0)
    });
  }

  const choices = new Map();
  if (validVoterId(voterId)) {
    const choicesResult = await db.prepare(`
      SELECT item_id, value
      FROM ballots
      WHERE voter_id = ?
    `).bind(voterId).all();

    for (const row of choicesResult.results || []) {
      choices.set(row.item_id, Number(row.value));
    }
  }

  return {
    items: RIGHTS.map((id) => {
      const count = counts.get(id) || { up: 0 };
      return {
        id,
        up: count.up,
        score: count.up,
        choice: choices.get(id) || 0
      };
    }),
    updatedAt: new Date().toISOString()
  };
}

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) {
    return json({ error: "Missing DB binding." }, 500);
  }

  await ensureSchema(db);
  return json(await snapshot(db, getVoterId(context.request)));
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

  const itemId = body.itemId;
  const value = Number(body.value);
  const voterId = getVoterId(context.request, body);

  if (!RIGHT_SET.has(itemId)) {
    return json({ error: "Unknown item." }, 400);
  }

  if (value !== 1) {
    return json({ error: "Vote must be 1." }, 400);
  }

  if (!validVoterId(voterId)) {
    return json({ error: "Missing or invalid voter id." }, 400);
  }

  await ensureSchema(db);

  const previous = await db.prepare(`
    SELECT value
    FROM ballots
    WHERE voter_id = ? AND item_id = ?
  `).bind(voterId, itemId).first();

  if (previous && Number(previous.value) === value) {
    await db.prepare(`
      DELETE FROM ballots
      WHERE voter_id = ? AND item_id = ?
    `).bind(voterId, itemId).run();
  } else {
    await db.prepare(`
      INSERT INTO ballots (voter_id, item_id, value, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(voter_id, item_id)
      DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).bind(voterId, itemId, value).run();
  }

  return json(await snapshot(db, voterId));
}
