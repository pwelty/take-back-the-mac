export async function ensureCommentsSchema(db) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        target_type TEXT NOT NULL CHECK (target_type IN ('right', 'idea')),
        target_id TEXT NOT NULL,
        body TEXT NOT NULL,
        author TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Pending',
        voter_id TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_comments_target ON comments (target_type, target_id, status, created_at)")
  ]);
}

export async function publicComments(db, targetType, targetIds) {
  if (!targetIds.length) return new Map();

  await ensureCommentsSchema(db);

  const targetSet = new Set(targetIds);
  const result = await db.prepare(`
    SELECT id, target_id AS targetId, body, author, created_at AS createdAt
    FROM comments
    WHERE target_type = ? AND status = 'Open'
    ORDER BY created_at ASC
    LIMIT 500
  `).bind(targetType).all();

  const grouped = new Map();
  for (const comment of result.results || []) {
    if (!targetSet.has(comment.targetId)) continue;

    const list = grouped.get(comment.targetId) || [];
    list.push({
      id: comment.id,
      body: comment.body,
      author: comment.author,
      createdAt: comment.createdAt
    });
    grouped.set(comment.targetId, list);
  }

  return grouped;
}
