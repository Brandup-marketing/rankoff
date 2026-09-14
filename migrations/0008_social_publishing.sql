-- Apply this file alone with d1 execute. Never replay historical migrations.
CREATE TABLE IF NOT EXISTS social_jobs (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL UNIQUE REFERENCES listings(id),
  first_settled_at TEXT NOT NULL,
  caption TEXT,
  card_model_json TEXT,
  image BLOB,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','complete','review')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  lease_token TEXT,
  lease_until TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS social_jobs_due ON social_jobs(state, next_attempt_at);
CREATE TABLE IF NOT EXISTS social_deliveries (
  job_id TEXT NOT NULL REFERENCES social_jobs(id),
  platform TEXT NOT NULL CHECK(platform IN ('facebook','instagram')),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','publishing','published','review')),
  container_id TEXT,
  post_id TEXT,
  last_error TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(job_id, platform)
);
