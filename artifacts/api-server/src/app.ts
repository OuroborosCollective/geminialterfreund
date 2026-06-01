import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.disable("x-powered-by"); // Security: Disable fingerprinting

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Security: Add defense-in-depth security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", "default-src 'self'");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

app.use(cors());
app.use(express.json({ limit: "10kb" })); // Security: Limit body size to mitigate DoS
app.use(express.urlencoded({ extended: true, limit: "10kb" })); // Security: Limit body size to mitigate DoS

app.use("/api", router);

// Security: Global error handler to prevent stack trace leakage.
// It uses req.log (from pino-http) to maintain request context in logs.
app.use(
  (
    err: Error & { status?: number },
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const statusCode = err.status ?? 500;
    const message = statusCode >= 500 ? "Internal Server Error" : err.message;

    // Log the error with request context using the pino-http logger
    req.log.error({ err }, "Unhandled error");

    res.status(statusCode).json({ error: message });
  },
);

export default app;
