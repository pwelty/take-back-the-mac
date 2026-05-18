const CATEGORIES = [
  "Uninstall",
  "Background",
  "App Store",
  "Services",
  "Privacy",
  "iOS",
  "Mac",
  "Other"
];

const CATEGORY_SET = new Set(CATEGORIES);

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

function cleanLine(value, maxLength) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
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

function cleanEmail(value) {
  return cleanLine(value, 254).toLowerCase();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function ensureSchema(db) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS ideas (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'Other',
        author TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Open',
        voter_id TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas (created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_ideas_voter_id ON ideas (voter_id)"),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS idea_votes (
        voter_id TEXT NOT NULL,
        idea_id TEXT NOT NULL,
        value INTEGER NOT NULL CHECK (value = 1),
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (voter_id, idea_id)
      )
    `),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_idea_votes_idea_id ON idea_votes (idea_id)")
  ]);

  const columns = await db.prepare("PRAGMA table_info(ideas)").all();
  const hasEmail = (columns.results || []).some((column) => column.name === "email");
  if (!hasEmail) {
    try {
      await db.prepare("ALTER TABLE ideas ADD COLUMN email TEXT NOT NULL DEFAULT ''").run();
    } catch (error) {
      if (!String(error?.message || error).includes("duplicate column")) {
        throw error;
      }
    }
  }
}

async function snapshot(db, voterId = "", sort = "top") {
  const orderBy = sort === "new"
    ? "ideas.created_at DESC"
    : "up DESC, ideas.created_at DESC";

  const result = await db.prepare(`
    SELECT
      ideas.id,
      ideas.title,
      ideas.body,
      ideas.category,
      ideas.author,
      ideas.status,
      ideas.created_at AS createdAt,
      COALESCE(SUM(CASE WHEN idea_votes.value = 1 THEN 1 ELSE 0 END), 0) AS up
    FROM ideas
    LEFT JOIN idea_votes ON idea_votes.idea_id = ideas.id
    GROUP BY ideas.id
    ORDER BY ${orderBy}
    LIMIT 100
  `).all();

  const choices = new Map();
  if (validVoterId(voterId)) {
    const choicesResult = await db.prepare(`
      SELECT idea_id, value
      FROM idea_votes
      WHERE voter_id = ?
    `).bind(voterId).all();

    for (const row of choicesResult.results || []) {
      choices.set(row.idea_id, Number(row.value));
    }
  }

  return {
    ideas: (result.results || []).map((idea) => ({
      id: idea.id,
      title: idea.title,
      body: idea.body,
      category: idea.category,
      author: idea.author,
      status: idea.status,
      createdAt: idea.createdAt,
      up: Number(idea.up || 0),
      score: Number(idea.up || 0),
      choice: choices.get(idea.id) || 0
    })),
    updatedAt: new Date().toISOString()
  };
}

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) {
    return json({ error: "Missing DB binding." }, 500);
  }

  const url = new URL(context.request.url);
  const sort = url.searchParams.get("sort") === "new" ? "new" : "top";

  await ensureSchema(db);
  return json(await snapshot(db, getVoterId(context.request), sort));
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

  const voterId = getVoterId(context.request, body);
  if (!validVoterId(voterId)) {
    return json({ error: "Missing or invalid voter id." }, 400);
  }

  const title = cleanLine(body.title, 120);
  const ideaBody = cleanBody(body.body, 1200);
  const author = cleanLine(body.author, 80);
  const email = cleanEmail(body.email);
  const category = CATEGORY_SET.has(body.category) ? body.category : "Other";

  if (title.length < 6) {
    return json({ error: "Idea title is too short." }, 400);
  }

  if (!validEmail(email)) {
    return json({ error: "A valid email is required." }, 400);
  }

  await ensureSchema(db);

  const recent = await db.prepare(`
    SELECT COUNT(*) AS count
    FROM ideas
    WHERE voter_id = ? AND created_at > datetime('now', '-10 minutes')
  `).bind(voterId).first();

  if (Number(recent?.count || 0) >= 3) {
    return json({ error: "Add a few at a time before adding more ideas." }, 429);
  }

  const id = crypto.randomUUID();

  await db.batch([
    db.prepare(`
      INSERT INTO ideas (id, title, body, category, author, email, voter_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, title, ideaBody, category, author, email, voterId),
    db.prepare(`
      INSERT INTO idea_votes (voter_id, idea_id, value, updated_at)
      VALUES (?, ?, 1, CURRENT_TIMESTAMP)
    `).bind(voterId, id)
  ]);

  return json(await snapshot(db, voterId, "new"), 201);
}
