## 2025-05-14 - [Backend Hardening]
**Vulnerability:** Information leakage via `X-Powered-By` header and potential DoS via unrestricted payload sizes.
**Learning:** Default Express configuration is permissive. Fingerprinting allows attackers to target version-specific vulnerabilities, and missing payload limits can lead to memory exhaustion.
**Prevention:** Always call `app.disable("x-powered-by")` and set explicit `limit` on `express.json()` and `express.urlencoded()` middlewares in the main app entry point.

## 2026-06-01 - [Backend Hardening - Headers & Error Handling]
**Vulnerability:** Information leakage via stack traces and missing defense-in-depth headers (CSP, HSTS).
**Learning:** Express's default error handling can leak internal paths and stack traces. When using `pino-http`, the global error handler should use `req.log` to preserve request-specific context (like request IDs) in the error logs, rather than a generic global logger.
**Prevention:** Implement a global error handler that returns generic messages for 500-level errors and explicitly set security headers (CSP, HSTS, Referrer-Policy).
