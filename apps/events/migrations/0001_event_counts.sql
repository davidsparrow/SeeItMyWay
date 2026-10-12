-- Anonymous research counts: aggregates only.
-- One row per (UTC day, event name, allowlisted props). No individual events,
-- IPs, user agents, referrers, countries, cookies or request IDs, ever.
CREATE TABLE event_counts (
  day TEXT NOT NULL,      -- UTC date, YYYY-MM-DD
  name TEXT NOT NULL,     -- an ANONYMOUS_EVENTS name from @simw/privacy
  props TEXT NOT NULL,    -- canonical (sorted-key) JSON of the already-allowlisted props
  count INTEGER NOT NULL CHECK (count > 0),
  PRIMARY KEY (day, name, props)
) WITHOUT ROWID;
