CREATE TABLE IF NOT EXISTS ballots (
  voter_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value IN (-1, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (voter_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_ballots_item_id ON ballots (item_id);
