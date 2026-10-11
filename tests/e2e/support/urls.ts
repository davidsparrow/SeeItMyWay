export const WEB_PORT = 3100;
export const DEMO_PORT = 5175;

/** `BASE_URL` points the web tests at a deployment (smoke test); otherwise a local `next start`. */
export const DEPLOYED_URL = process.env.BASE_URL?.replace(/\/+$/, '') || null;
export const WEB_URL = DEPLOYED_URL ?? `http://localhost:${WEB_PORT}`;
/** The plain-HTML SDK fixture always runs locally under `vite preview`. */
export const DEMO_URL = `http://localhost:${DEMO_PORT}`;
