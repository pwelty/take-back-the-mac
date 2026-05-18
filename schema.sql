CREATE TABLE IF NOT EXISTS ballots (
  voter_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value IN (-1, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (voter_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_ballots_item_id ON ballots (item_id);

CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Other',
  author TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Open',
  voter_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas (created_at);
CREATE INDEX IF NOT EXISTS idx_ideas_voter_id ON ideas (voter_id);

CREATE TABLE IF NOT EXISTS idea_votes (
  voter_id TEXT NOT NULL,
  idea_id TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value IN (-1, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (voter_id, idea_id)
);

CREATE INDEX IF NOT EXISTS idx_idea_votes_idea_id ON idea_votes (idea_id);
