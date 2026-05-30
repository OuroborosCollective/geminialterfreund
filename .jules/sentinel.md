## 2025-05-14 - [Backend Hardening]
**Vulnerability:** Information leakage via `X-Powered-By` header and potential DoS via unrestricted payload sizes.
**Learning:** Default Express configuration is permissive. Fingerprinting allows attackers to target version-specific vulnerabilities, and missing payload limits can lead to memory exhaustion.
**Prevention:** Always call `app.disable("x-powered-by")` and set explicit `limit` on `express.json()` and `express.urlencoded()` middlewares in the main app entry point.
