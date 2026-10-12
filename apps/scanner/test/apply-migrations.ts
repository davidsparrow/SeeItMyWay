import { applyD1Migrations, env } from 'cloudflare:test';

// Setup files run outside isolated per-test storage, so this applies once per test file.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
