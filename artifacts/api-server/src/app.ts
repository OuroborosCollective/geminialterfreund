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
// Security: Add basic security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

app.use(cors());
app.use(express.json({ limit: "10kb" })); // Security: Limit body size to mitigate DoS
app.use(express.urlencoded({ extended: true, limit: "10kb" })); // Security: Limit body size to mitigate DoS

app.use("/api", router);

// Global error handler: sanitized response and centralized logging
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const reqLog = (req as any).log || logger;
  reqLog.error({ err }, "Unhandled application error");

  res.status(500).json({
    error: "Internal Server Error",
  });
});

export default app;
