-- Site Listener Test reports. A site URL isn't personal data, but we keep only
-- what the report needs: the normalized URL (origin + path, never a query
-- string or fragment), the report itself and its expiry. Nothing about who asked.
CREATE TABLE scan_reports (
  id TEXT PRIMARY KEY,          -- random, 128 bits, base64url
  url TEXT NOT NULL,            -- normalized: origin + path
  created_at INTEGER NOT NULL,  -- unix ms
  expires_at INTEGER NOT NULL,  -- unix ms; a daily cron deletes expired rows
  report TEXT NOT NULL          -- ScanReport JSON (@simw/scanner-core)
);
CREATE INDEX scan_reports_url_created ON scan_reports (url, created_at);
CREATE INDEX scan_reports_expires ON scan_reports (expires_at);

-- Emulated screenshots ("see your site through different visitor preferences"). Short-lived.
CREATE TABLE scan_views (
  report_id TEXT NOT NULL,
  variant TEXT NOT NULL,
  image BLOB NOT NULL,          -- JPEG
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (report_id, variant)
);
CREATE INDEX scan_views_expires ON scan_views (expires_at);
