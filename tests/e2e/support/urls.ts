export const WEB_PORT = 3100;
export const DEMO_PORT = 5175;

/** `BASE_URL` points the web tests at a deployment (smoke test); otherwise a local `next start`. */
export const DEPLOYED_URL = process.env.BASE_URL?.replace(/\/+$/, '') || null;
export const WEB_URL = DEPLOYED_URL ?? `http://localhost:${WEB_PORT}`;
/** The plain-HTML SDK fixture always runs locally under `vite preview`. */
export const DEMO_URL = `http://localhost:${DEMO_PORT}`;

/**
 * The events URL baked into the local web build for the browser tests (the root
 * `test:e2e` script sets it). Nothing listens there: tests intercept the requests.
 */
export const E2E_EVENTS_URL = process.env.NEXT_PUBLIC_EVENTS_URL ?? 'http://127.0.0.1:8799';
